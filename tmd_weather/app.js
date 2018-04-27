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

function formatKey(strVal)
{
  var result = strVal.split(" ");
  var dateArr = result[0].split("/");
  var timeArr = result[1].split(":");

  var dateId = new Date(Number(dateArr[2]), Number(dateArr[1]), Number(dateArr[0]), Number(timeArr[0]), Number(timeArr[1]), Number(timeArr[2]), 0);

  return dateId.getTime();
}

function formatData(dataObj)
{
  var textOut = "<html><head>TMD Weather</head>";
  textOut += "<body><p class='p3'><span class='s1'>Weather report from collection storage</span></p><div>";

  textOut += "<table border='0'>" + "<tr style='background-color:aliceblue;'><td style='text-align:center;'>"
      + "<b>Report Date</b>" + "</td><td style='text-align:center;'>" + "<b>Number</b>"
      + "</td><td style='text-align:center;'>" + "<b>Station</b>" + "</td><td style='text-align:center;'>"
      + "<b>Latitude</b>" + "</td><td style='text-align:center;'>" + "<b>Longitude</b>"
      + "</td><td style='text-align:center;'>" +  "<b>Weather Time</b>" + "</td><td style='text-align:center;'>"
      + "<b>Pressure</b>" + "</td><td style='text-align:center;'>" + "<b>Humidity</b>"
      + "</td><td style='text-align:center;'>" + "<b>Temperature</b>" + "</td><td style='text-align:center;'>"
      + "<b>DewPoint</b>" + "</td><td style='text-align:center;'>" + "<b>Rainfall</b>" + "</td></tr>";
    
  var index, date, no, name, lat, lon, time, pressure, humid, temp, dew, rain;

  dataObj.forEach(data => {
    index = 0;
    while (data.Stations[index])
    {
        date = data.ReportDate;
        no = data.Stations[index].WmoNumber;
        name = data.Stations[index].StationNameTh;
        lat = Number(data.Stations[index].Latitude);
        lon = Number(data.Stations[index].Longitude);
        time = data.Stations[index].ObserveTime;
        pressure = data.Stations[index].Pressure;
        humid = data.Stations[index].Humidity;
        temp = data.Stations[index].Temperature;
        dew = data.Stations[index].DewPoint;
        rain = data.Stations[index].Rainfall;
            
        if (humid >= 100 || (humid > 90 && temp <= dew) || rain > 0) // Precip
        {   
            textOut += "<tr style='background-color:lightgreen;color:red;'><td>";
        }
        else if ((pressure <= 1008 && humid > 90) || (temp - dew) <= 1) // Potential to precip
        {   
            textOut += "<tr style='background-color:lightyellow;'><td>";
        }
        else
        {
            textOut += "<tr><td>";
        }
        textOut += date.toLocaleString() + "</td><td style='text-align:center;'>" + no + "</td><td>"
          + name + "</td><td>" + lat.toPrecision(10) + "</td><td>" + lon.toPrecision(11) + "</td><td>"
          + time.toLocaleString() + "</td><td style='text-align:right;'>" + pressure.toPrecision(6) + "</td><td style='text-align:right;'>"
          + humid.toString() + "</td><td style='text-align:right;'>" + temp.toPrecision(4) + "</td><td style='text-align:right;'>"
          + dew.toPrecision(4) + "</td><td style='text-align:right;'>" + rain.toString() + "</td></tr>";

        index++;
    }
  });

  textOut += "</table></div>";
  textOut += "<button onclick='window.location.reload(true)'>Refresh</button></body></html>";

  return textOut;
}

function retriveData(key, client)
{
  var htmlPage;
  const query = datastore.createQuery("TMD_Weather")
    .order("WeatherId", {
      descending: true,
  });//.filter("ReportId", "=", key);

  datastore.runQuery(query).then(results => {
    // Task entities found.
    var reports = results[0];
    htmlPage = formatData(reports);

    client.status(200);
    client.set('Content-Type', 'text/html');
    client.send(htmlPage);
    client.end;
  });

  return htmlPage;
}

app.get('/', (req, res) => {
  var arg = "";
  retriveData(arg, res);
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});
// [END app]
