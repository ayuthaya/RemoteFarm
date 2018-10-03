/**
 * Copyright 2017, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// [START app]
'use strict';

// [START setup]
const express = require('express');
const crypto = require('crypto');

const app = express();
app.enable('trust proxy');

// By default, the client will authenticate using the service account file
// specified by the GOOGLE_APPLICATION_CREDENTIALS environment variable and use
// the project specified by the GOOGLE_CLOUD_PROJECT environment variable. See
// https://github.com/GoogleCloudPlatform/google-cloud-node/blob/master/docs/authentication.md
// These environment variables are set automatically on Google App Engine
const Datastore = require('@google-cloud/datastore');

// Instantiate a datastore client
const datastore = Datastore();
// [END setup]

function reformat(strVal)
{
  var result = strVal.split(" ");
  var dateArr = result[0].split("/");
  var timeArr = result[1].split(":");
  
  // Month number is zero based
  var dateId = new Date(Number(dateArr[2]), Number(dateArr[1]) - 1, Number(dateArr[0]), Number(timeArr[0]), Number(timeArr[1]), Number(timeArr[2]), 0);
  
  return dateId;
}

function storeData(obj)
{
  var keyVal = obj.Stations[0].ObserveTime.getTime();
  obj.WeatherId = keyVal;

  const tmdKey = datastore.key(['TMD_Weather', keyVal]);
  var entity = {
    key: tmdKey,
    data: obj
  };

  const transaction = datastore.transaction();
  return transaction.run()
    .then(() => transaction.get(tmdKey))
    .then(results => {
      const weather = results[0];
      if (weather)
      {
        // The weather entity already exists.
        return transaction.rollback();
      } 
      else 
      {
        // Create the weather entity.
        transaction.save(entity);
        return transaction.commit();
      }
    })
    .catch(() => transaction.rollback());
}

function filterData(keys, content) {

  var dataObj = JSON.parse(content);

  var cleansObj = new Object();

  cleansObj.ReportDate = reformat(dataObj.Header.LastBuiltDate);
  cleansObj.Precip = 0;
  cleansObj.Potential = 0;
  cleansObj.Stations = new Array();
  
  var report, pressure, humid, temp, dew, rain;
  var count = 0;
  var index = 0;
  while (dataObj.Stations[index] && count < keys.length)
  {
    if (keys.indexOf(dataObj.Stations[index].WmoNumber) >= 0)
    {
      pressure = Number(dataObj.Stations[index].Observe.StationPressure.Value);
      humid = Number(dataObj.Stations[index].Observe.RelativeHumidity.Value);
      temp = Number(dataObj.Stations[index].Observe.Temperature.Value);
      dew = Number(dataObj.Stations[index].Observe.DewPoint.Value);
      rain = Number(dataObj.Stations[index].Observe.Rainfall.Value);

      report = {
        "WmoNumber" : dataObj.Stations[index].WmoNumber,
        "StationNameTh" : dataObj.Stations[index].StationNameTh,
        "Latitude" : Number(dataObj.Stations[index].Latitude.Value),
        "Longitude" : Number(dataObj.Stations[index].Longitude.Value),
        "ObserveTime" : reformat(dataObj.Stations[index].Observe.Time),
        "Pressure" : pressure,
        "Humidity" : humid,
        "Temperature" : temp,
        "DewPoint" : dew,
        "Rainfall" : rain
      };

      if (humid >= 100 || (humid > 90 && temp <= dew) || rain > 0) // Precip
      {
        cleansObj.Precip++;
        cleansObj.Stations.push(report);
      }
      else if ((pressure <= 1008 && humid > 90) || (temp - dew) <= 1) // Potential to precip
      {
        cleansObj.Potential++;
        cleansObj.Stations.push(report);
      }

      count++;
    }
    index++;
  }

  if (cleansObj.Stations.length > 0)
  {
    storeData(cleansObj);
  }
}

function getWeather(client)
{ 
  var http = require('http');

  var htmlPage;
  var inStr = "";
  var args = new Array("48430", "48439");
  
  http.get('http://data.tmd.go.th/api/Weather3Hours/V1/?type=json', function(resp) {
    resp.on('data', function(chunk) {
      inStr += chunk;
    });
    resp.on('end', function() {
      if (resp.statusCode == 200)
      {
        filterData(args, inStr);

        client.sendStatus(200);
        client.end;
      }
      else
      {
        console.log('Error at origin!');
      }
    });
  }).on("error", function(e) {
    console.log("Error: " + e.message);
  });
}

app.get('/', (req, res) => {
  getWeather(res);
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
// [END app]
