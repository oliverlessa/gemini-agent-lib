## Exemplo de retorno da chamada do LLM com Google Search

```json
{
  "candidates": [
    {
      "content": {
        "role": "model",
        "parts": [
          {
            "text": "Para fornecer as últimas notícias sobre tecnologia, farei algumas pesquisas no Google.\n\n"
          },
          {
            "text": "Aqui estão algumas das últimas notícias sobre tecnologia, de acordo com as fontes pesquisadas:\n\n*   **Tecmundo:**\n\n    *   10 notícias de tecnologia para você começar o dia (27/03)\n    *   A integração com ERP, CRM e IA transformando operações. (22/03)\n    *   Power bank pega fogo durante voo e obriga avião a fazer pouso de emergência na China. (21/03)\n*   **Exame:**\n\n    *   JPMorgan usa computação quântica para gerar números aleatórios reais e avançam em criptografia.\n    *   Apple divulga bastidores de 'Ruptura' e mostra edição em Macs com 83 TB e cenas com 70 ângulos.\n    *   Tim Cook, CEO da Apple, fortalece laços com a DeepSeek e ecossistema de IA da China.\n    *   Carro voador 'com design retrô' de R$ 1,7 milhão se prepara para decolar em breve; veja o vídeo.\n*   **Money Times:**\n\n    *   X recupera valor de mercado após queda de 80%; Elon Musk investiu US$ 150 bilhões na plataforma em 2024.\n*   **SAPO:**\n\n    *   CEO Fraud: PJ detém mulher de 24 anos que fez burlas de \"largas dezenas de milhares de euros\".\n    *   Google Maps vai usar mais informação de contexto para ajudar na navegação.\n    *   H&M vai usar clones digitais de 30 modelos para anúncios e redes sociais.\n*   **Veja:**\n\n    *   Diretor da Thomson Reuters aponta vantagem dos brasileiros na adoção de IA.\n\nEspero que isso ajude!\n\n**Fontes:**\n\n*   TecMundo: [https://www.tecmundo.com.br/tecnologia](https://www.tecmundo.com.br/tecnologia)\n*   Exame: [https://exame.com/tecnologia/](https://exame.com/tecnologia/)\n*   Money Times: [https://www.moneytimes.com.br/tecnologia/](https://www.moneytimes.com.br/tecnologia/)\n*   SAPO: [https://tek.sapo.pt/](https://tek.sapo.pt/)\n*   Veja: [https://veja.abril.com.br/tecnologia/](https://veja.abril.com.br/tecnologia/)\n"
          }
        ]
      },
      "finishReason": "STOP",
      "safetyRatings": [
        {
          "category": "HARM_CATEGORY_HATE_SPEECH",
          "probability": "NEGLIGIBLE",
          "probabilityScore": 8.9378545e-7,
          "severity": "HARM_SEVERITY_NEGLIGIBLE"
        },
        {
          "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
          "probability": "NEGLIGIBLE",
          "probabilityScore": 7.8454593e-7,
          "severity": "HARM_SEVERITY_NEGLIGIBLE"
        },
        {
          "category": "HARM_CATEGORY_HARASSMENT",
          "probability": "NEGLIGIBLE",
          "probabilityScore": 4.429737e-7,
          "severity": "HARM_SEVERITY_NEGLIGIBLE"
        },
        {
          "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          "probability": "NEGLIGIBLE",
          "probabilityScore": 1.4609203e-7,
          "severity": "HARM_SEVERITY_NEGLIGIBLE"
        }
      ],
      "groundingMetadata": {
        "webSearchQueries": [
          "últimas notícias sobre tecnologia"
        ],
        "searchEntryPoint": {
          "renderedContent": "<style>\n.container {\n  align-items: center;\n  border-radius: 8px;\n  display: flex;\n  font-family: Google Sans, Roboto, sans-serif;\n  font-size: 14px;\n  line-height: 20px;\n  padding: 8px 12px;\n}\n.chip {\n  display: inline-block;\n  border: solid 1px;\n  border-radius: 16px;\n  min-width: 14px;\n  padding: 5px 16px;\n  text-align: center;\n  user-select: none;\n  margin: 0 8px;\n  -webkit-tap-highlight-color: transparent;\n}\n.carousel {\n  overflow: auto;\n  scrollbar-width: none;\n  white-space: nowrap;\n  margin-right: -12px;\n}\n.headline {\n  display: flex;\n  margin-right: 4px;\n}\n.gradient-container {\n  position: relative;\n}\n.gradient {\n  position: absolute;\n  transform: translate(3px, -9px);\n  height: 36px;\n  width: 9px;\n}\n@media (prefers-color-scheme: light) {\n  .container {\n    background-color: #fafafa;\n    box-shadow: 0 0 0 1px #0000000f;\n  }\n  .headline-label {\n    color: #1f1f1f;\n  }\n  .chip {\n    background-color: #ffffff;\n    border-color: #d2d2d2;\n    color: #5e5e5e;\n    text-decoration: none;\n  }\n  .chip:hover {\n    background-color: #f2f2f2;\n  }\n  .chip:focus {\n    background-color: #f2f2f2;\n  }\n  .chip:active {\n    background-color: #d8d8d8;\n    border-color: #b6b6b6;\n  }\n  .logo-dark {\n    display: none;\n  }\n  .gradient {\n    background: linear-gradient(90deg, #fafafa 15%, #fafafa00 100%);\n  }\n}\n@media (prefers-color-scheme: dark) {\n  .container {\n    background-color: #1f1f1f;\n    box-shadow: 0 0 0 1px #ffffff26;\n  }\n  .headline-label {\n    color: #fff;\n  }\n  .chip {\n    background-color: #2c2c2c;\n    border-color: #3c4043;\n    color: #fff;\n    text-decoration: none;\n  }\n  .chip:hover {\n    background-color: #353536;\n  }\n  .chip:focus {\n    background-color: #353536;\n  }\n  .chip:active {\n    background-color: #464849;\n    border-color: #53575b;\n  }\n  .logo-light {\n    display: none;\n  }\n  .gradient {\n    background: linear-gradient(90deg, #1f1f1f 15%, #1f1f1f00 100%);\n  }\n}\n</style>\n<div class=\"container\">\n  <div class=\"headline\">\n    <svg class=\"logo-light\" width=\"18\" height=\"18\" viewBox=\"9 9 35 35\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n      <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M42.8622 27.0064C42.8622 25.7839 42.7525 24.6084 42.5487 23.4799H26.3109V30.1568H35.5897C35.1821 32.3041 33.9596 34.1222 32.1258 35.3448V39.6864H37.7213C40.9814 36.677 42.8622 32.2571 42.8622 27.0064V27.0064Z\" fill=\"#4285F4\"/>\n      <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M26.3109 43.8555C30.9659 43.8555 34.8687 42.3195 37.7213 39.6863L32.1258 35.3447C30.5898 36.3792 28.6306 37.0061 26.3109 37.0061C21.8282 37.0061 18.0195 33.9811 16.6559 29.906H10.9194V34.3573C13.7563 39.9841 19.5712 43.8555 26.3109 43.8555V43.8555Z\" fill=\"#34A853\"/>\n      <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M16.6559 29.8904C16.3111 28.8559 16.1074 27.7588 16.1074 26.6146C16.1074 25.4704 16.3111 24.3733 16.6559 23.3388V18.8875H10.9194C9.74388 21.2072 9.06992 23.8247 9.06992 26.6146C9.06992 29.4045 9.74388 32.022 10.9194 34.3417L15.3864 30.8621L16.6559 29.8904V29.8904Z\" fill=\"#FBBC05\"/>\n      <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M26.3109 16.2386C28.85 16.2386 31.107 17.1164 32.9095 18.8091L37.8466 13.8719C34.853 11.082 30.9659 9.3736 26.3109 9.3736C19.5712 9.3736 13.7563 13.245 10.9194 18.8875L16.6559 23.3388C18.0195 19.2636 21.8282 16.2386 26.3109 16.2386V16.2386Z\" fill=\"#EA4335\"/>\n    </svg>\n    <svg class=\"logo-dark\" width=\"18\" height=\"18\" viewBox=\"0 0 48 48\" xmlns=\"http://www.w3.org/2000/svg\">\n      <circle cx=\"24\" cy=\"23\" fill=\"#FFF\" r=\"22\"/>\n      <path d=\"M33.76 34.26c2.75-2.56 4.49-6.37 4.49-11.26 0-.89-.08-1.84-.29-3H24.01v5.99h8.03c-.4 2.02-1.5 3.56-3.07 4.56v.75l3.91 2.97h.88z\" fill=\"#4285F4\"/>\n      <path d=\"M15.58 25.77A8.845 8.845 0 0 0 24 31.86c1.92 0 3.62-.46 4.97-1.31l4.79 3.71C31.14 36.7 27.65 38 24 38c-5.93 0-11.01-3.4-13.45-8.36l.17-1.01 4.06-2.85h.8z\" fill=\"#34A853\"/>\n      <path d=\"M15.59 20.21a8.864 8.864 0 0 0 0 5.58l-5.03 3.86c-.98-2-1.53-4.25-1.53-6.64 0-2.39.55-4.64 1.53-6.64l1-.22 3.81 2.98.22 1.08z\" fill=\"#FBBC05\"/>\n      <path d=\"M24 14.14c2.11 0 4.02.75 5.52 1.98l4.36-4.36C31.22 9.43 27.81 8 24 8c-5.93 0-11.01 3.4-13.45 8.36l5.03 3.85A8.86 8.86 0 0 1 24 14.14z\" fill=\"#EA4335\"/>\n    </svg>\n    <div class=\"gradient-container\"><div class=\"gradient\"></div></div>\n  </div>\n  <div class=\"carousel\">\n    <a class=\"chip\" href=\"https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblry9BQpMgD5ouVXpmL0JPXYkvpYbQzSOwLtAlJDF2yYBwwN32c2CxmAchkMguH99OS-62N4Z9UeY5DwFAvs--dcI_9qvRIuOBprS7ml5MExdZIDcGnNxLtnXQNS2QJOGYCs59FLY2yjK6r22P3N6iF9ka2UDZEEz8vyxUhMd-Rkh2Fh1q-1gUcHGd0HLiFFwKWfpMWgPnKllwspW-QdCbpPDOIZ7imccUC0qyI7wcQ==\">últimas notícias sobre tecnologia</a>\n  </div>\n</div>\n"
        },
        "groundingChunks": [
          {
            "web": {
              "uri": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrzYuh0LJ5hrftxNI1MsYvZ6oiv6doLcTF_f2ffhEf0WcLbXoGcqX6KaXm-XF7FIiSc1sceh-UdyG4MEIfEUlFI_Zg9omVgDlOFSWGNLtBBDbiw1PbEYow_eFl1AuF6J5Sg=",
              "title": "tecmundo.com.br",
              "domain": "tecmundo.com.br"
            }
          },
          {
            "web": {
              "uri": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblryQrhi-nRzOWIuI74hLZjrc2aVt_IAnDnsMqESkxUXnV1No07Sr8YIuvZMShsH7Zvx9NbzwX2YUUwJw1VxP0KP9dqtoi7mS4o7ZjLYDzIHUQ2iRBldbgow=",
              "title": "exame.com",
              "domain": "exame.com"
            }
          },
          {
            "web": {
              "uri": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrxXaFHZ7fLYXOwWTNZN-J_0h-1hkxKAYh--t_o0CknFM8j6IsgkgNaYHNhFEPAi0GJIza2kINMtTr-r0-g8an7bFLrPNytpGk7OfwcHb78MjfoyPk3fH1xbgD8zkpg4Np3Kxh7cZ4f6",
              "title": "moneytimes.com.br",
              "domain": "moneytimes.com.br"
            }
          },
          {
            "web": {
              "uri": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblrw4cOgDd_dqZNHbJnkMkpf7ETwLg5gcRN6n6XJJwzSH-4xj8CkT54fUP5V3Jup--ATTC3cBe-ptFBYuAWDpxH8yTgYIDt6tTyxJ8ZuvCVp1f1dOWkxF6rRC1mi-d8iMU85t",
              "title": "sapo.pt",
              "domain": "sapo.pt"
            }
          },
          {
            "web": {
              "uri": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AQXblryxsdf8d_pjp2n7x7iS27-uw91oalYSu2NUVhAaJdNmlbdss-juSpLa27vCTqEJtrHpIcuJXZP87Jh97eLXxJHgtK8VM1IeBlkw7l27F6UCM9MBZNf69ZCX3lxKexxAX_hONdJ7EfNcIAZyDw7thg==",
              "title": "abril.com.br",
              "domain": "abril.com.br"
            }
          }
        ],
        "groundingSupports": [
          {
            "segment": {
              "startIndex": 281,
              "endIndex": 352,
              "text": "*   A integração com ERP, CRM e IA transformando operações. (22/03)"
            },
            "groundingChunkIndices": [
              0
            ],
            "confidenceScores": [
              0.8791917
            ]
          },
          {
            "segment": {
              "startIndex": 357,
              "endIndex": 448,
              "text": "*   Power bank pega fogo durante voo e obriga avião a fazer pouso de emergência na China."
            },
            "groundingChunkIndices": [
              0
            ],
            "confidenceScores": [
              0.9822696
            ]
          },
          {
            "segment": {
              "startIndex": 477,
              "endIndex": 582,
              "text": "*   JPMorgan usa computação quântica para gerar números aleatórios reais e avançam em criptografia."
            },
            "groundingChunkIndices": [
              1
            ],
            "confidenceScores": [
              0.98623925
            ]
          },
          {
            "segment": {
              "startIndex": 587,
              "endIndex": 689,
              "text": "*   Apple divulga bastidores de 'Ruptura' e mostra edição em Macs com 83 TB e cenas com 70 ângulos."
            },
            "groundingChunkIndices": [
              1
            ],
            "confidenceScores": [
              0.9907861
            ]
          },
          {
            "segment": {
              "startIndex": 694,
              "endIndex": 783,
              "text": "*   Tim Cook, CEO da Apple, fortalece laços com a DeepSeek e ecossistema de IA da China."
            },
            "groundingChunkIndices": [
              1
            ],
            "confidenceScores": [
              0.975548
            ]
          },
          {
            "segment": {
              "startIndex": 788,
              "endIndex": 891,
              "text": "*   Carro voador 'com design retrô' de R$ 1,7 milhão se prepara para decolar em breve; veja o vídeo."
            },
            "groundingChunkIndices": [
              1
            ],
            "confidenceScores": [
              0.9875009
            ]
          },
          {
            "segment": {
              "startIndex": 918,
              "endIndex": 1028,
              "text": "*   X recupera valor de mercado após queda de 80%; Elon Musk investiu US$ 150 bilhões na plataforma em 2024."
            },
            "groundingChunkIndices": [
              2
            ],
            "confidenceScores": [
              0.98027736
            ]
          },
          {
            "segment": {
              "startIndex": 1048,
              "endIndex": 1147,
              "text": "*   CEO Fraud: PJ detém mulher de 24 anos que fez burlas de \"largas dezenas de milhares de euros\"."
            },
            "groundingChunkIndices": [
              3
            ],
            "confidenceScores": [
              0.97772825
            ]
          },
          {
            "segment": {
              "startIndex": 1152,
              "endIndex": 1234,
              "text": "*   Google Maps vai usar mais informação de contexto para ajudar na navegação."
            },
            "groundingChunkIndices": [
              3
            ],
            "confidenceScores": [
              0.96883136
            ]
          },
          {
            "segment": {
              "startIndex": 1239,
              "endIndex": 1317,
              "text": "*   H&M vai usar clones digitais de 30 modelos para anúncios e redes sociais."
            },
            "groundingChunkIndices": [
              3
            ],
            "confidenceScores": [
              0.9872617
            ]
          },
          {
            "segment": {
              "startIndex": 1337,
              "endIndex": 1418,
              "text": "*   Diretor da Thomson Reuters aponta vantagem dos brasileiros na adoção de IA."
            },
            "groundingChunkIndices": [
              4
            ],
            "confidenceScores": [
              0.9765707
            ]
          }
        ],
        "retrievalMetadata": {}
      },
      "index": 0
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 197,
    "candidatesTokenCount": 563,
    "totalTokenCount": 760,
    "trafficType": "ON_DEMAND",
    "promptTokensDetails": [
      {
        "modality": "TEXT",
        "tokenCount": 197
      }
    ],
    "candidatesTokensDetails": [
      {
        "modality": "TEXT",
        "tokenCount": 563
      }
    ]
  },
  "modelVersion": "gemini-2.0-flash-001",
  "createTime": "2025-03-28T15:25:17.221336Z",
  "responseId": "Xb_mZ5jBDZOWmecPoO70iQg"
}
```