#include <string.h>
#include <stdlib.h>

const byte ADER_ANZAHL = 25;
const byte BEFEHL_LAENGE = 50;
const unsigned long BAUDRATE = 9600;
const unsigned int SCHALTZEIT_MS = 12;
const unsigned int PAUSE_MS = 25;

const byte ausgangspins[ADER_ANZAHL] = {
  22, 23, 24, 25, 26,
  27, 28, 29, 30, 31,
  32, 33, 34, 35, 36,
  37, 38, 39, 40, 41,
  42, 43, 44, 45, 46
};

const byte eingangspins[ADER_ANZAHL] = {
  A0, A1, A2, A3, A4,
  A5, A6, A7, A8, A9,
  A10, A11, A12, A13, A14,
  A15, 2, 3, 4, 5,
  6, 7, 8, 9, 10
};

bool jsonFormat = true;
char befehl[BEFEHL_LAENGE];

struct Ergebnis {
  byte pin;
  byte ziel;
  byte treffer[ADER_ANZAHL];
  byte anzahl;
  const char* status;
  const char* meldung;
};

bool leseBefehl(char* ziel, size_t groesse);
void trimmen(char* text);
void grossMachen(char* text);
bool beginntMit(const char* text, const char* start);
bool istZahl(const char* text);
void verarbeiteBefehl(char* text);
void verarbeitePinBefehl(const char* text);
void vorbereiten();
void gesamttest();
Ergebnis testeAder(byte aderIndex);
void sendeBereit();
void sendeStart();
void sendeEnde(byte ok, byte vertauscht, byte kurzschluss, byte unterbrochen);
void sendeErgebnis(Ergebnis ergebnis);
void sendeStatus();
void sendeFormat(const char* wert);
void sendeInfo(const char* meldung);
void sendeFehler(const char* meldung);
void hilfe();

void setup() {
  Serial.begin(BAUDRATE);
  Serial.setTimeout(150);
  vorbereiten();
  sendeBereit();
}

void loop() {
  if (!Serial.available()) {
    return;
  }

  if (!leseBefehl(befehl, sizeof(befehl))) {
    sendeFehler("Leerer Befehl");
    return;
  }

  verarbeiteBefehl(befehl);
}

bool leseBefehl(char* ziel, size_t groesse) {
  size_t laenge = Serial.readBytesUntil('\n', ziel, groesse - 1);
  ziel[laenge] = '\0';
  trimmen(ziel);
  grossMachen(ziel);
  return strlen(ziel) > 0;
}

void trimmen(char* text) {
  char* start = text;

  while (*start == ' ' || *start == '\t' || *start == '\r' || *start == '\n') {
    start++;
  }

  char* ende = start + strlen(start);

  while (ende > start && (*(ende - 1) == ' ' || *(ende - 1) == '\t' || *(ende - 1) == '\r' || *(ende - 1) == '\n')) {
    ende--;
  }

  size_t neueLaenge = ende - start;

  if (start != text) {
    memmove(text, start, neueLaenge);
  }

  text[neueLaenge] = '\0';
}

void grossMachen(char* text) {
  for (byte i = 0; text[i] != '\0'; i++) {
    if (text[i] >= 'a' && text[i] <= 'z') {
      text[i] = text[i] - 32;
    }
  }
}

bool beginntMit(const char* text, const char* start) {
  return strncmp(text, start, strlen(start)) == 0;
}

bool istZahl(const char* text) {
  if (text == NULL || *text == '\0') {
    return false;
  }

  for (byte i = 0; text[i] != '\0'; i++) {
    if (text[i] < '0' || text[i] > '9') {
      return false;
    }
  }

  return true;
}

void verarbeiteBefehl(char* text) {
  if (strcmp(text, "TEST") == 0) {
    gesamttest();
    return;
  }

  if (beginntMit(text, "PIN ")) {
    verarbeitePinBefehl(text);
    return;
  }

  if (strcmp(text, "PIN") == 0) {
    sendeFehler("Adernummer fehlt");
    return;
  }

  if (strcmp(text, "STATUS") == 0) {
    sendeStatus();
    return;
  }

  if (strcmp(text, "FORMAT JSON") == 0) {
    jsonFormat = true;
    sendeFormat("json");
    return;
  }

  if (strcmp(text, "FORMAT TEXT") == 0) {
    jsonFormat = false;
    sendeFormat("text");
    return;
  }

  if (strcmp(text, "RESET") == 0) {
    vorbereiten();
    sendeInfo("Pins wurden zurueckgesetzt");
    return;
  }

  if (strcmp(text, "HILFE") == 0 || strcmp(text, "HELP") == 0) {
    hilfe();
    return;
  }

  sendeFehler("Unbekannter Befehl");
}

void verarbeitePinBefehl(const char* text) {
  const char* wert = text + 3;

  while (*wert == ' ') {
    wert++;
  }

  if (!istZahl(wert)) {
    sendeFehler("Adernummer ist keine Zahl");
    return;
  }

  int nummer = atoi(wert);

  if (nummer < 1 || nummer > ADER_ANZAHL) {
    sendeFehler("Ungueltige Adernummer");
    return;
  }

  Ergebnis ergebnis = testeAder(nummer - 1);
  sendeErgebnis(ergebnis);
}

void vorbereiten() {
  for (byte i = 0; i < ADER_ANZAHL; i++) {
    pinMode(ausgangspins[i], INPUT);
    digitalWrite(ausgangspins[i], LOW);
    pinMode(eingangspins[i], INPUT_PULLUP);
  }
}

void gesamttest() {
  byte ok = 0;
  byte vertauscht = 0;
  byte kurzschluss = 0;
  byte unterbrochen = 0;

  sendeStart();

  for (byte i = 0; i < ADER_ANZAHL; i++) {
    Ergebnis ergebnis = testeAder(i);
    sendeErgebnis(ergebnis);

    if (strcmp(ergebnis.status, "ok") == 0) {
      ok++;
    } else if (strcmp(ergebnis.status, "vertauscht") == 0) {
      vertauscht++;
    } else if (strcmp(ergebnis.status, "kurzschluss") == 0) {
      kurzschluss++;
    } else if (strcmp(ergebnis.status, "unterbrochen") == 0) {
      unterbrochen++;
    }

    delay(PAUSE_MS);
  }

  vorbereiten();
  sendeEnde(ok, vertauscht, kurzschluss, unterbrochen);
}

Ergebnis testeAder(byte aderIndex) {
  Ergebnis ergebnis;

  ergebnis.pin = aderIndex + 1;
  ergebnis.ziel = 0;
  ergebnis.anzahl = 0;
  ergebnis.status = "unbekannt";
  ergebnis.meldung = "Kein Ergebnis";

  for (byte i = 0; i < ADER_ANZAHL; i++) {
    ergebnis.treffer[i] = 0;
  }

  vorbereiten();

  pinMode(ausgangspins[aderIndex], OUTPUT);
  digitalWrite(ausgangspins[aderIndex], LOW);

  delay(SCHALTZEIT_MS);

  for (byte i = 0; i < ADER_ANZAHL; i++) {
    if (digitalRead(eingangspins[i]) == LOW) {
      if (ergebnis.anzahl < ADER_ANZAHL) {
        ergebnis.treffer[ergebnis.anzahl] = i + 1;
        ergebnis.anzahl++;
      }
    }
  }

  if (ergebnis.anzahl == 0) {
    ergebnis.status = "unterbrochen";
    ergebnis.ziel = 0;
    ergebnis.meldung = "Keine Verbindung erkannt";
  } else if (ergebnis.anzahl == 1 && ergebnis.treffer[0] == aderIndex + 1) {
    ergebnis.status = "ok";
    ergebnis.ziel = ergebnis.treffer[0];
    ergebnis.meldung = "Ader ist korrekt verbunden";
  } else if (ergebnis.anzahl == 1) {
    ergebnis.status = "vertauscht";
    ergebnis.ziel = ergebnis.treffer[0];
    ergebnis.meldung = "Ader liegt auf einem anderen Kontakt";
  } else {
    ergebnis.status = "kurzschluss";
    ergebnis.ziel = 0;
    ergebnis.meldung = "Mehrere Kontakte reagieren gleichzeitig";
  }

  vorbereiten();
  return ergebnis;
}

void sendeBereit() {
  if (jsonFormat) {
    Serial.print("{\"typ\":\"bereit\",\"adern\":");
    Serial.print(ADER_ANZAHL);
    Serial.println("}");
  } else {
    Serial.print("BEREIT: ");
    Serial.print(ADER_ANZAHL);
    Serial.println(" Adern");
  }
}

void sendeStart() {
  if (jsonFormat) {
    Serial.print("{\"typ\":\"start\",\"adern\":");
    Serial.print(ADER_ANZAHL);
    Serial.println("}");
  } else {
    Serial.print("TEST START: ");
    Serial.print(ADER_ANZAHL);
    Serial.println(" Adern");
  }
}

void sendeEnde(byte ok, byte vertauscht, byte kurzschluss, byte unterbrochen) {
  if (jsonFormat) {
    Serial.print("{\"typ\":\"ende\",\"ok\":");
    Serial.print(ok);
    Serial.print(",\"vertauscht\":");
    Serial.print(vertauscht);
    Serial.print(",\"kurzschluss\":");
    Serial.print(kurzschluss);
    Serial.print(",\"unterbrochen\":");
    Serial.print(unterbrochen);
    Serial.println("}");
  } else {
    Serial.print("TEST ENDE: OK=");
    Serial.print(ok);
    Serial.print(", VERTAUSCHT=");
    Serial.print(vertauscht);
    Serial.print(", KURZSCHLUSS=");
    Serial.print(kurzschluss);
    Serial.print(", UNTERBROCHEN=");
    Serial.println(unterbrochen);
  }
}

void sendeErgebnis(Ergebnis ergebnis) {
  if (jsonFormat) {
    Serial.print("{\"typ\":\"pin\",\"pin\":");
    Serial.print(ergebnis.pin);
    Serial.print(",\"status\":\"");
    Serial.print(ergebnis.status);
    Serial.print("\",\"ziel\":");
    Serial.print(ergebnis.ziel);
    Serial.print(",\"treffer\":[");

    for (byte i = 0; i < ergebnis.anzahl; i++) {
      if (i > 0) {
        Serial.print(",");
      }
      Serial.print(ergebnis.treffer[i]);
    }

    Serial.print("],\"meldung\":\"");
    Serial.print(ergebnis.meldung);
    Serial.println("\"}");
  } else {
    Serial.print("PIN ");
    Serial.print(ergebnis.pin);
    Serial.print(": ");
    Serial.print(ergebnis.status);
    Serial.print(", ZIEL ");
    Serial.print(ergebnis.ziel);
    Serial.print(", TREFFER [");

    for (byte i = 0; i < ergebnis.anzahl; i++) {
      if (i > 0) {
        Serial.print(",");
      }
      Serial.print(ergebnis.treffer[i]);
    }

    Serial.print("], ");
    Serial.println(ergebnis.meldung);
  }
}

void sendeStatus() {
  if (jsonFormat) {
    Serial.print("{\"typ\":\"status\",\"bereit\":true,\"adern\":");
    Serial.print(ADER_ANZAHL);
    Serial.print(",\"format\":\"json\",\"baudrate\":");
    Serial.print(BAUDRATE);
    Serial.println("}");
  } else {
    Serial.print("STATUS: bereit, ");
    Serial.print(ADER_ANZAHL);
    Serial.print(" Adern, Format text, Baudrate ");
    Serial.println(BAUDRATE);
  }
}

void sendeFormat(const char* wert) {
  if (jsonFormat) {
    Serial.print("{\"typ\":\"format\",\"wert\":\"");
    Serial.print(wert);
    Serial.println("\"}");
  } else {
    Serial.print("FORMAT: ");
    Serial.println(wert);
  }
}

void sendeInfo(const char* meldung) {
  if (jsonFormat) {
    Serial.print("{\"typ\":\"info\",\"meldung\":\"");
    Serial.print(meldung);
    Serial.println("\"}");
  } else {
    Serial.print("INFO: ");
    Serial.println(meldung);
  }
}

void sendeFehler(const char* meldung) {
  if (jsonFormat) {
    Serial.print("{\"typ\":\"fehler\",\"meldung\":\"");
    Serial.print(meldung);
    Serial.println("\"}");
  } else {
    Serial.print("FEHLER: ");
    Serial.println(meldung);
  }
}

void hilfe() {
  if (jsonFormat) {
    Serial.println("{\"typ\":\"hilfe\",\"befehle\":[\"TEST\",\"PIN 1..25\",\"STATUS\",\"FORMAT JSON\",\"FORMAT TEXT\",\"RESET\",\"HILFE\"]}");
  } else {
    Serial.println("Befehle: TEST, PIN 1..25, STATUS, FORMAT JSON, FORMAT TEXT, RESET, HILFE");
  }
}
