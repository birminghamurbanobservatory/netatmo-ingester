# Netatmo Ingester


## Netatmo querks

It's important that this app did NOT use the `rain_live` value from the [getpublicdata](https://dev.netatmo.com/apidocumentation/weather#getpublicdata) request. Although it updates every 10 minutes, it does NOT show the accumulation over the whole 10 minutes, just the last 5 minutes, therefore if you summed up all these rain_live values for the it could fall well below the actual daily accumulation as you'd essentially missed out on counting half the accumulations. Instead workout the accumulation since the last reading from `rain_24h` instead, i.e. subtract the last reading from the current one, this will give the accumulation over a roughly 10 minute period.