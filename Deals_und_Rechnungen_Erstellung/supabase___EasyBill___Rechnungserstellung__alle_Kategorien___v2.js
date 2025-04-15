{
  
// Kommentare und Erklärung zu jedem Node:
// n8n Workflow: supabase - EasyBill - Rechnungserstellung (alle Kategorien)
// -----------------------------------------------------------------------------
// Automatisierte Rechnungserstellung über EasyBill mit Kategoriefiltern & Supabase-Datenbank

/**
 * Zeitlicher Auslöser: Alle 30 Minuten
 * → startet den Prozess zyklisch
 */
{
  node: 'Schedule Trigger',
  action: 'Startet den Workflow alle 30 Minuten'
}

/**
 * Datum vorbereiten für die Rechnungsfilterung
 * → wandelt Zeitstempel in YYYY-MM-DD Format
 */
{
  node: 'Date & Time',
  action: 'Konvertiere Zeitstempel für Abfrage nach Rechnungen'
}

/**
 * Supabase: Filtert alle Rechnungen mit Status "DB_erstellt" zum heutigen Tag
 */
{
  node: 'get Rechnung',
  action: 'Abfrage in "rechnungen"-Tabelle mit Statusfilter'
}

/**
 * Supabase: Holt Kundendaten anhand der Hubspot-ID
 */
{
  node: 'get Kunden',
  action: 'Verknüpft Rechnung mit Kundenprofil aus "kunde"-Tabelle'
}

/**
 * Supabase: Holt zugehörigen Deal inkl. Produkt-Zuordnung
 */
{
  node: 'get Produkt from Deal',
  action: 'Extrahiert Produkt-ID aus "deals" für spätere Zuordnung'
}

/**
 * Supabase: Holt Produktinformationen anhand des Produktnamens
 */
{
  node: 'get Produkt',
  action: 'Lädt Produktdaten aus "produkte"-Tabelle'
}

/**
 * Verknüpft Rechnungen + Kunden + Produktinformationen
 * via SQL JOIN über Input1–3
 */
{
  node: 'Merge',
  action: 'SQL-Merge aus Rechnung, Kunde & Produkt via ID-Zuordnung'
}

/**
 * Code-Node: Erstellt und finalisiert Rechnung in EasyBill via API
 * Mandant = Kategorie 1 → API Key A
 */
{
  node: 'Code',
  action: 'Verarbeitet Rechnung für Kategorie 1'
}

/**
 * Supabase: Aktualisiert Rechnungsstatus & IDs nach erfolgreicher Erstellung
 */
{
  node: 'Supabase1',
  action: 'Speichert EasyBill-ID, Status und Fälligkeitsdatum zurück'
}

// -----------------------------------------------------------------------------
// Hinweise:
// - Kategorie-Zweigfilterung über easybill_kategorie optional, hier entfällt sie
// - Mandantensteuerung über separaten Workflow oder Parametrisierung möglich
// - Fehlerhandling integriert (JSON Rückgabe mit success: false)


  
// ------------------------------------------------------------------------------


  
  "name": "supabase - EasyBill - Rechnungserstellung (alle Kategorien) _v2",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 30
            }
          ]
        }
      },
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [
        -2760,
        7840
      ],
      "id": "b6497551-133f-4a19-92ab-14133b612f47",
      "name": "Schedule Trigger"
    },
    {
      "parameters": {
        "mode": "combineBySql",
        "numberInputs": 3,
        "query": "SELECT *\nFROM input1\nINNER JOIN input2 ON\ninput1.name = input2.id\nINNER JOIN input3 ON input2.hubspot_produkt_id = input3.hubspot_produkt_id\n\n   "
      },
      "type": "n8n-nodes-base.merge",
      "typeVersion": 3,
      "position": [
        -1380,
        7840
      ],
      "id": "62ba08c5-eedf-4c83-8153-72de0bb3fdc4",
      "name": "Merge"
    },
    {
      "parameters": {
        "operation": "update",
        "tableId": "rechnungen",
        "filters": {
          "conditions": [
            {
              "keyName": "rechnung_datenbank_id",
              "condition": "eq",
              "keyValue": "={{ $('get Rechnung').item.json.rechnung_datenbank_id }}"
            }
          ]
        },
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "easybill_rechnung_id",
              "fieldValue": "={{ $json.invoiceNumber }}"
            },
            {
              "fieldId": "easybill_dokument_id",
              "fieldValue": "={{ $json.documentId }}"
            },
            {
              "fieldId": "invoice",
              "fieldValue": "easybill_erstellt"
            },
            {
              "fieldId": "invoice_status",
              "fieldValue": "offen"
            },
            {
              "fieldId": "faelligkeitsdatum_rechnung",
              "fieldValue": "={{ $json.due_date }}}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        -860,
        7840
      ],
      "id": "ecbe9e36-4cb3-4ada-8aea-90206ed7ab45",
      "name": "Supabase1",
      "credentials": {
        "supabaseApi": {
          "id": "5apRBjeRddQHqIml",
          "name": "SupaBase BV Finance DB"
        }
      }
    },
    {
      "parameters": {
        "operation": "formatDate",
        "date": "={{ $json.timestamp }}",
        "format": "yyyy-MM-dd",
        "options": {}
      },
      "type": "n8n-nodes-base.dateTime",
      "typeVersion": 2,
      "position": [
        -2460,
        7840
      ],
      "id": "fbf2f9ba-1d79-4a37-8877-22a689c92d3b",
      "name": "Date & Time"
    },
    {
      "parameters": {
        "operation": "getAll",
        "tableId": "rechnungen",
        "limit": 1,
        "matchType": "allFilters",
        "filters": {
          "conditions": [
            {
              "keyName": "invoice",
              "condition": "eq",
              "keyValue": "DB_erstellt"
            },
            {
              "keyName": "rechnungsdatum",
              "condition": "eq",
              "keyValue": "={{ $json.formattedDate }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        -2220,
        7840
      ],
      "id": "0d43689a-af47-48a3-9987-6ed672c3786f",
      "name": "get Rechnung",
      "credentials": {
        "supabaseApi": {
          "id": "5apRBjeRddQHqIml",
          "name": "SupaBase BV Finance DB"
        }
      }
    },
    {
      "parameters": {
        "operation": "get",
        "tableId": "kunde",
        "filters": {
          "conditions": [
            {
              "keyName": "hubspot_kunden_id",
              "keyValue": "={{ $json.kunden_id }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        -1780,
        7640
      ],
      "id": "535a43f1-3506-4c99-b725-0f2e1bd051b1",
      "name": "get Kunden",
      "credentials": {
        "supabaseApi": {
          "id": "5apRBjeRddQHqIml",
          "name": "SupaBase BV Finance DB"
        }
      }
    },
    {
      "parameters": {
        "operation": "get",
        "tableId": "produkte",
        "filters": {
          "conditions": [
            {
              "keyName": "name",
              "keyValue": "={{ $json.product_name }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        -1680,
        8040
      ],
      "id": "94844e0c-ebf2-4920-8645-0e32f66768df",
      "name": "get Produkt",
      "credentials": {
        "supabaseApi": {
          "id": "5apRBjeRddQHqIml",
          "name": "SupaBase BV Finance DB"
        }
      }
    },
    {
      "parameters": {
        "operation": "get",
        "tableId": "deals",
        "filters": {
          "conditions": [
            {
              "keyName": "hubspot_deal_id",
              "keyValue": "={{ $json.hubspot_deal_id }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        -1860,
        8040
      ],
      "id": "afdf227b-4206-4e4a-80f3-ab185f37de1b",
      "name": "get Produkt from Deal",
      "credentials": {
        "supabaseApi": {
          "id": "5apRBjeRddQHqIml",
          "name": "SupaBase BV Finance DB"
        }
      }
    },
    {
      "parameters": {
        "jsCode": 
        /**
 * n8n Function Node
 */

const apiKey = '7zDToaoQlotLDQHnQwUKgBKOEIljhEvbmRkJ5TgBIIVaqo02pXlTz6yJFyOcihGB';
const baseUrl = 'https://api.easybill.de/rest/v1';

/** 
 * Hilfsfunktion: GET 
 */
async function httpGet(thisContext, endpoint, qs = {}) {
  const options = {
    method: 'GET',
    url: `${baseUrl}${endpoint}`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    qs,
    json: true,
  };
  return thisContext.helpers.httpRequest(options);
}

/** 
 * Hilfsfunktion: POST 
 */
async function httpPost(thisContext, endpoint, body = {}) {
  const options = {
    method: 'POST',
    url: `${baseUrl}${endpoint}`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body,
    json: true,
  };
  return thisContext.helpers.httpRequest(options);
}

/** 
 * Hilfsfunktion: PUT 
 */
async function httpPut(thisContext, endpoint, body = undefined) {
  const options = {
    method: 'PUT',
    url: `${baseUrl}${endpoint}`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    json: true,
  };
  if (body !== undefined) {
    options.body = body;
  }
  return thisContext.helpers.httpRequest(options);
}

/**
 * Kunde in Easybill per E-Mail suchen
 */
async function getCustomerByEmail(thisContext, email) {
  const data = await httpGet(thisContext, '/customers', { emails: email });
  if (data && data.items && data.items.length > 0) {
    return data.items[0];
  }
  return null;
}

/**
 * Produkt (Position) in Easybill per Nummer/Name suchen
 */
async function getProductByName(thisContext, productName) {
  const data = await httpGet(thisContext, '/positions', { number: productName });
  if (data && data.items && data.items.length > 0) {
    return data.items[0];
  }
  return null;
}

/** 
 * Rechnung erstellen (POST /documents)
 */
async function createInvoice(thisContext, invoicePayload) {
  return httpPost(thisContext, '/documents', invoicePayload);
}

/** 
 * Rechnung finalisieren
 */
async function finalizeDocument(thisContext, documentId) {
  return httpPut(thisContext, `/documents/${documentId}/done`);
}

/**
 * Hauptfunktion: Liest dein JSON aus und erzeugt + finalisiert die Rechnung.
 */
async function execute() {
  const items = $input.all(); // Alle eingehenden Items (z. B. 1 Item)
  const returnData = [];

  for (let i = 0; i < items.length; i++) {
    try {
      // JSON-Daten vom aktuellen Item
      const data = items[i].json;

      // ---------------------------------------
      // 1) Felder aus deinem JSON entnehmen
      // ---------------------------------------
      const {
        hubspot_kunden_id,
        vorname_kunde,
        nachname_kunde,
        strasse_hausnummer_kunde,
        plz_kunde,
        stadt_kunde,
        land,
        unternehmen,
        email,
        easybill_kunden_id,
        rate,
        rechnungsdatum,
        rechnungsbetrag,
        rechnung_datenbank_id,
        name,
        firma,
        produkt_typ,
        beschreibung
      } = data;

      // Datum und Fälligkeit in YYYY-MM-DD umwandeln
      const invoiceDate = rechnungsdatum ? rechnungsdatum.slice(0, 10) : null; 

      // Wir wollen am Ende "dealId_rechnungsnummer" ausgeben
      const dealidRechnungsnummer = `${rechnung_datenbank_id}`;

      // ---------------------------------------
      // 2) Kunde in Easybill suchen
      // ---------------------------------------
      const foundCustomer = await getCustomerByEmail(this, email);
      if (!foundCustomer) {
        throw new Error(`Kunde mit E-Mail "${email}" nicht in Easybill gefunden.`);
      }

      // ---------------------------------------
      // 3) Produkt in Easybill suchen
      // ---------------------------------------
      const foundProduct = await getProductByName(this, name);
      if (!foundProduct) {
        throw new Error(`Produkt "${name}" nicht in Easybill gefunden (Artikelnummer).`);
      }

      // ---------------------------------------
      // 4) Rechnung erstellen (POST /documents)
      // ---------------------------------------
      const docPayload = {
        document_type: 'INVOICE',        // Rechnung
        customer_id: foundCustomer.id,   // ID des gefundenen Kunden
        document_date: invoiceDate,      // "2025-04-07"
        due_date: invoiceDate,           // Fälligkeitsdatum (kann angepasst werden)
        currency: 'EUR',
        items: [
          {
            type: 'POSITION', 
            position_id: foundProduct.id, 
            quantity: rate, 
            single_price_gross: betrag || 0,
            vat_percent: 0, // ggf. anpassen
          },
        ],
      };

      // Rechnung erzeugen
      const createdDocument = await createInvoice(this, docPayload);

      // ---------------------------------------
      // 5) Rechnung finalisieren (PUT /documents/:id/done)
      // ---------------------------------------
      const finalizedDocument = await finalizeDocument(this, createdDocument.id);

      // ---------------------------------------
      // 6) Ergebnis zurückgeben (inkl. Dokumenten-ID und Rechnungsnummer)
      // ---------------------------------------
      returnData.push({
        json: {
          success: true,
          message: 'Rechnung erfolgreich erstellt und finalisiert.',
          documentId: createdDocument.id,
          invoiceNumber: finalizedDocument.number,
          dealid_rechnungsnummer: dealidRechnungsnummer,
        },
      });

    } catch (error) {
      returnData.push({ json: { success: false, error: error.message } });
    }
  }

  return returnData;
}

return execute();

      },

      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -1060,
        7840
      ],
      "id": "b5b75340-f5dd-4f6b-8dd4-489c6e252641",
      "name": "Rechnung_in_easybill"
    }
  ],
  "pinData": {},
  "connections": {
    "Schedule Trigger": {
      "main": [
        [
          {
            "node": "Date & Time",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Merge": {
      "main": [
        [
          {
            "node": "Rechnung_in_easybill",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Date & Time": {
      "main": [
        [
          {
            "node": "get Rechnung",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "get Rechnung": {
      "main": [
        [
          {
            "node": "get Kunden",
            "type": "main",
            "index": 0
          },
          {
            "node": "Merge",
            "type": "main",
            "index": 1
          },
          {
            "node": "get Produkt from Deal",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "get Kunden": {
      "main": [
        [
          {
            "node": "Merge",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "get Produkt": {
      "main": [
        [
          {
            "node": "Merge",
            "type": "main",
            "index": 2
          }
        ]
      ]
    },
    "get Produkt from Deal": {
      "main": [
        [
          {
            "node": "get Produkt",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Rechnung_in_easybill": {
      "main": [
        [
          {
            "node": "Supabase1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": false,
  "settings": {
    "executionOrder": "v1"
  },
  "versionId": "4aca1134-f6a8-4897-8f81-ceac90efd564",
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "4ce3415e4d4e6f8f088d9362c05b2a358e7e5ede6a150bc21300c8fe32718369"
  },
  "id": "YIbiU95sLjHkdlzJ",
  "tags": [
    {
      "createdAt": "2025-04-04T05:42:52.822Z",
      "updatedAt": "2025-04-04T05:42:52.822Z",
      "id": "LrWxGybOzI5XxfD3",
      "name": "EasyBill"
    },
    {
      "createdAt": "2025-04-03T09:46:45.826Z",
      "updatedAt": "2025-04-03T09:46:45.826Z",
      "id": "QOILfriCRSp3bEBO",
      "name": "Supabase"
    }
  ]
}
