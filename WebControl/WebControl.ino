/*
  Web Control Server

 A simple web server that reports the value of the sensor pins.
 and interprets switch commands for relays using an Ethernet shield.

 Circuit:
 * Ethernet shield attached to pins 10, 11, 12, 13
 * Analog inputs attached to pins A0 through A5 (optional)

 modified 25 Apr 2018
 by Ayuthaya

 */

#include <SPI.h>
#include <Ethernet.h>

// Names for the 8 Digital pins link to 8 Relay board
// pins IN1, IN2, IN3, IN4, IN5, IN6, IN7, IN8

#define RELAY0 5
#define RELAY1 6
#define RELAY2 7
#define RELAY3 8
#define RELAY4 9
#define RELAY5 11   // pin 10 occupied?
#define RELAY6 12
#define RELAY7 13

// Enter a MAC address and IP address for your controller below.
// The IP address will be dependent on your local network:
byte mac[] = {
  0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED
};
IPAddress ip(192, 168, 1, 111);

// Initialize the Ethernet server library
// with the IP address and port you want to use
// (port 80 HTTP default is blocked by internet provider):
EthernetServer server(8008);

int settings[] = {HIGH, HIGH, HIGH, HIGH, HIGH, HIGH, HIGH};

void clearSwitchs()
{
  digitalWrite(RELAY0, HIGH);
  digitalWrite(RELAY1, HIGH);
  digitalWrite(RELAY2, HIGH);
  digitalWrite(RELAY3, HIGH);
  digitalWrite(RELAY4, HIGH);
  digitalWrite(RELAY5, HIGH);
  digitalWrite(RELAY6, HIGH);
  digitalWrite(RELAY7, HIGH);

  for (int index = 0; index < 7; index++)
  {
    settings[index] = HIGH;
  }
}

int getParams(String query, String* names, String* vals)
{
  String param = "";
  int index = 0;
  int valIdx = -1;
  int fieldIdx = -1;
  while (query.length() > 0)
  {
    param = query.substring(0, query.indexOf("&"));
    fieldIdx = param.length();
    valIdx = param.indexOf("=");
    names[index] = param.substring(0, valIdx);
    vals[index] = param.substring(valIdx + 1);
    query = query.substring(fieldIdx + 1);

    index++;
  }

  return index;
}

String formatData(String* keys, float* values)
{
  int current = millis();
  String json = "{\"Station\":{\"ID\":\"RIVERSIDE\", \"Time\":" + String(current);
  json += ",\"" + keys[0] + "\":" + String(values[0]);
  json += ",\"" + keys[1] + "\":" + String(values[1]);
  json += ",\"" + keys[2] + "\":" + String(values[2]);
  json += ",\"" + keys[3] + "\":" + String(values[3]) + "}}";

  return json;
}

String genReport(String* keys, String* values)
{
  String report = "";
  float sensor_vals[4];
  
  for (int index = 0; index < 4; index++)
  {
    sensor_vals[index] = values[index].toFloat();
  }
  
  return formatData(keys, sensor_vals);
}

void turnSwitch(String* keys, String* values)
{
  int val = 0;

  clearSwitchs();

  for (int index = 0; index < 7; index++)   // Exclude breaker at RELAY0
  {
    val = values[index].toInt();
    if (keys[index].equals("SWITCH1") == true)
    {
      if (val > 0)
      {
        digitalWrite(RELAY1, LOW);
        settings[index] = LOW;
      }
    }
    else if (keys[index].equals("SWITCH2") == true)
    {
      if (val > 0)
      {
        digitalWrite(RELAY2, LOW);
        settings[index] = LOW;
      }
    }
    else if (keys[index].equals("SWITCH3") == true)
    {
      if (val > 0)
      {
        digitalWrite(RELAY3, LOW);
        settings[index] = LOW;
      }
    }
    else if (keys[index].equals("SWITCH4") == true)
    {
      if (val > 0)
      {
        digitalWrite(RELAY4, LOW);
        settings[index] = LOW;
      }
    }
    else if (keys[index].equals("SWITCH5") == true)
    {
      if (val > 0)
      {
        digitalWrite(RELAY5, LOW);
        settings[index] = LOW;
      }
    }
    else if (keys[index].equals("SWITCH6") == true)
    {
      if (val > 0)
      {
        digitalWrite(RELAY6, LOW);
        settings[index] = LOW;
      }
    }
    else if (keys[index].equals("SWITCH7") == true)
    {
      if (val > 0)
      {
        digitalWrite(RELAY7, LOW);
        settings[index] = LOW;
      }
    }
  }

  return settings;
}

// Verify if all swithchs match the command
// then turn the breaker ON
String verifySwitch(String* keys)
{
  int state[7];
  String relayStatus[] = {"0", "0", "0", "0", "0", "0", "0"};

  if ((state[0] = digitalRead(RELAY1)) == LOW)
  {
    relayStatus[0] = "1";
  }

  if ((state[1] = digitalRead(RELAY2)) == LOW)
  {
    relayStatus[1] = "1";
  }

  if ((state[2] = digitalRead(RELAY3)) == LOW)
  {
    relayStatus[2] = "1";
  }

  if ((state[3] = digitalRead(RELAY4)) == LOW)
  {
    relayStatus[3] = "1";
  }

  if ((state[4] = digitalRead(RELAY5)) == LOW)
  {
    relayStatus[4] = "1";
  }

  if ((state[5] = digitalRead(RELAY6)) == LOW)
  {
    relayStatus[5] = "1";
  }

  if ((state[6] = digitalRead(RELAY7)) == LOW)
  {
    relayStatus[6] = "1";
  }

  String res = "{\"status\":{";
  bool readyStatus = true;
  bool onStatus = false;
  for (int index = 0; index < 7; index++)
  {
    if (state[index] == LOW)
    {
      onStatus = true;
    }
    
    if (state[index] != settings[index])
    {
      readyStatus = false;
    }
    res += "\"" + keys[index] + "\":";
    res += relayStatus[index] + ",";
  }

  if (readyStatus == true && onStatus == true)
  {
    digitalWrite(RELAY0, LOW);
    res += "\"BREAKER\":1}}";
  }
  else
  {
    digitalWrite(RELAY0, HIGH);
    res += "\"BREAKER\":0}}";
  }

  return res;
}

String doRequest(String req)
{
  String fields[7];
  String params[7];
  String query = "";
  String res = "";

  req.remove(req.indexOf("HTTP"));
  req.trim();
  
  String oper = req.substring(req.lastIndexOf("/") + 1);
  oper.remove(oper.indexOf("?"));
  
  int idx = req.indexOf("?");
  if (idx >= 0)
  {
    // Get operation request
    String temp = req.substring(0, idx);

    // Get request parameters
    query = req.substring(idx + 1);
  
    if (getParams(query, fields, params) > 0)
    {
      if (oper.equals("command") == true)
      {
        // Do command
        turnSwitch(fields, params);
        delay(200);
        res = verifySwitch(fields);
      }
      else
      {
        // Generate report
        res = genReport(fields, params);
      }
    }
  }

  return res;
}

void setup()
{
  // Open serial communications and wait for port to open:
  Serial.begin(9600);
  while (!Serial)
  {
    ; // wait for serial port to connect. Needed for native USB port only
  }

  // Initialise th data pins for OUTPUT
  pinMode(RELAY0, OUTPUT);
  pinMode(RELAY1, OUTPUT);
  pinMode(RELAY2, OUTPUT);
  pinMode(RELAY3, OUTPUT);
  pinMode(RELAY4, OUTPUT);
  pinMode(RELAY5, OUTPUT);
  pinMode(RELAY6, OUTPUT);
  pinMode(RELAY7, OUTPUT);

  clearSwitchs();


  // start the Ethernet connection and the server:
  Ethernet.begin(mac, ip);
  server.begin();
  Serial.print("server is at ");
  Serial.println(Ethernet.localIP());
}


void loop()
{
  // listen for incoming clients
  EthernetClient client = server.available();
  if (client)
  {
    Serial.println("new client");

    String request = "";
    String response = "";
    
    // an http request ends with a blank line
    bool contRead = true;
    bool currentLineIsBlank = true;
    while (client.connected() && contRead == true)
    {
      if (client.available())
      {
        char c = client.read();
        
        request += c;
        
        Serial.write(c);
        // if you've gotten to the end of the line (received a newline
        // character) and the line is blank, the http request has ended,
        // so you can send a reply
        if (c == '\n')
        {
          if (currentLineIsBlank)
          {
            // send a standard http response header
            client.println("HTTP/1.1 200 OK");
            client.println("Content-Type: application/json");
            client.println("Connection: close");  // the connection will be closed after completion of the response
            //client.println("Refresh: 5");  // refresh the page automatically every 5 sec
            client.println();
  
            response = doRequest(request);
            
            client.println(response);
            Serial.println(response);
            
            contRead = false;
          }
          else
          {
            if (request.indexOf("GET") < 0)
            {
              request = "";
            }
            
            // you're starting a new line
            currentLineIsBlank = true;
          }
        }
        else if (c != '\r')
        { 
          // you've gotten a character on the current line
          currentLineIsBlank = false;
        }
      }
    }
    
    // give the web browser time to receive the data
    delay(100);
    
    // close the connection:
    client.stop();
    Serial.println("client disconnected");
  }
}

