{
  "name": "Rechnung Bezahlt Status in Supabase Updaten",
  "nodes": [
    {
      "parameters": {
        "operation": "get",
        "tableId": "rechnungen",
        "filters": {
          "conditions": [
            {
              "keyName": "easybill_rechnung_id",
              "keyValue": "20250401-2507"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        400,
        0
      ],
      "id": "64905dfa-f32a-4de8-9b74-5c4da7fb0dfc",
      "name": "Supabase",
      "credentials": {
        "supabaseApi": {
          "id": "5apRBjeRddQHqIml",
          "name": "SupaBase BV Finance DB"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const apiKey = '7zDToaoQlotLDQHnQwUKgBKOEIljhEvbmRkJ5TgBIIVaqo02pXlTz6yJFyOcihGB';\nconst baseUrl = 'https://api.easybill.de/rest/v1';\nconst originalInvoiceNumber = $input.first().json.easybill_rechnung_id ; // <- Gesuchte Rechnungsnummer\n\nasync function httpGet(thisContext, endpoint, qs = {}) {\n  const options = {\n    method: 'GET',\n    url: `${baseUrl}${endpoint}`,\n    headers: {\n      Authorization: `Bearer ${apiKey}`,\n      'Content-Type': 'application/json',\n    },\n    qs,\n    json: true,\n  };\n  return thisContext.helpers.httpRequest(options);\n}\n\nasync function execute() {\n  const returnData = [];\n\n  // 1. Hauptrechnung suchen\n  const result = await httpGet(this, '/documents', {\n    number: originalInvoiceNumber\n  });\n\n  const foundDocs = Array.isArray(result?.items) ? result.items : [];\n\n  for (const doc of foundDocs) {\n    const amount = doc.amount || 0;\n    const paidAmount = doc.paid_amount || 0;\n\n    const dueDateRaw = doc.due_date ? new Date(doc.due_date) : null;\n    const dueInDays = doc.due_in_days || 0;\n    const dueDate = dueDateRaw ? new Date(dueDateRaw.getTime()) : null;\n    if (dueDate) dueDate.setDate(dueDate.getDate() + dueInDays);\n\n    // 2. Alle Dokumente abrufen (optional: Pagination)\n    const allDocsRes = await httpGet(this, '/documents', { limit: 500 });\n    const allDocs = Array.isArray(allDocsRes?.items) ? allDocsRes.items : [];\n\n    // 3. Reminder und Mahnungen, die sich auf genau diese Rechnung beziehen\n    const refDocs = allDocs.filter(ref =>\n      ref.reference_id === doc.id &&\n      ['REMINDER', 'DUNNING'].includes((ref.type || '').toUpperCase())\n    );\n\n    // 4. Maximal je 1 Reminder + 1 Dunning zurückgeben\n    \n\n    // 5. Status bestimmen\n    let statusCode = null;\n    if (amount === 0 || paidAmount === amount) {\n      statusCode = 2; // BEZAHLT\n    } else if (doc.type === 'STORNO' || doc.type === 'STORNO_PROFORMA_INVOICE') {\n      statusCode = 6; // STORNIERT\n    } else if (doc.type === 'DUNNING') {\n      statusCode = 5; // MAHNUNG\n    } else if (doc.type === 'REMINDER') {\n      statusCode = 4; // ERINNERUNG\n    } else if (dueDate && dueDate < new Date()) {\n      statusCode = 3; // ÜBERFÄLLIG\n    } else if (!doc.type) {\n      statusCode = 7; // KEINE REFERENZ\n    } else {\n      statusCode = 1; // FÄLLIG\n    }\n\n    // 6. Ergebnis zusammenbauen\n    returnData.push({\n      json: {\n        document_id: doc.id,\n        number: doc.number,\n        type: doc.type,\n        status: doc.status || doc.state,\n        created_at: doc.created_at,\n        due_date: doc.due_date,\n        due_in_days: dueInDays,\n        amount: amount,\n        paid_amount: paidAmount,\n        reference_number: doc.reference_number,\n        status_code: statusCode,\n  \n        status_description: {\n          1: 'FÄLLIG',\n          2: 'BEZAHLT',\n          3: 'ÜBERFÄLLIG',\n          4: 'ERINNERUNG',\n          5: 'MAHNUNG',\n          6: 'STORNIERT',\n          7: 'KEINE REFERENZ'\n        }[statusCode]\n      }\n    });\n  }\n\n    return returnData;\n}\n\nreturn execute();\n"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        640,
        0
      ],
      "id": "53a7271e-31ec-4937-94c8-87a40e09a229",
      "name": "Code"
    },
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 10
            }
          ]
        }
      },
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [
        -100,
        0
      ],
      "id": "e6cc8dc4-b29d-4c08-857a-e347f0fee1cf",
      "name": "Schedule Trigger"
    },
    {
      "parameters": {
        "operation": "update",
        "tableId": "rechnungen",
        "matchType": "allFilters",
        "filters": {
          "conditions": [
            {
              "keyName": "easybill_dokument_id",
              "condition": "eq",
              "keyValue": "={{ $('Supabase').item.json.easybill_dokument_id }}"
            },
            {
              "keyName": "easybill_rechnung_id",
              "condition": "eq",
              "keyValue": "={{ $('Supabase').item.json.easybill_rechnung_id }}"
            }
          ]
        },
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "invoice_status",
              "fieldValue": "={{ $json.status_description }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        1260,
        0
      ],
      "id": "35c5be9b-f56e-4c78-9aef-47c12e131f95",
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
        120,
        0
      ],
      "id": "9217ab14-5dac-4f4d-9753-aed92581bd9d",
      "name": "Date & Time"
    }
  ],
  "pinData": {},
  "connections": {
    "Supabase": {
      "main": [
        [
          {
            "node": "Code",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
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
    "Code": {
      "main": [
        [
          {
            "node": "Supabase1",
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
            "node": "Supabase",
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
  "versionId": "b5b44e32-25ea-4029-8c65-08f9ac866a68",
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "4ce3415e4d4e6f8f088d9362c05b2a358e7e5ede6a150bc21300c8fe32718369"
  },
  "id": "XXXppdh2HnY2QoYJ",
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
