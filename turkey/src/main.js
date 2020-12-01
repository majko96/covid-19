const Apify = require('apify');
const LATEST = 'LATEST'

Apify.main(async () => {
    const kvStore = await Apify.openKeyValueStore('COVID-19-TURKEY')
    const dataset = await Apify.openDataset('COVID-19-TURKEY-HISTORY')
  
    const requestQueue = await Apify.openRequestQueue();
    await requestQueue.addRequest({ url: 'https://covid19.saglik.gov.tr/?_Dil=2' });

    const handlePageFunction = async ({ request, $ }) => {
        const title = $('title').text();
        const script = $('script').toArray().find(scr => $(scr).html().includes('var sondurumjson'));
        const scriptHTML = $(script).html();
        const json = JSON.parse(scriptHTML.substring(scriptHTML.indexOf('var sondurumjson') + 19, scriptHTML.lastIndexOf('}];') + 2));

        const tested = json[0].toplam_test
        const infected = json[0].toplam_hasta
        const deceased = json[0].toplam_vefat
        const recovered = json[0].toplam_iyilesen
        const critical = json[0].agir_hasta_sayisi
        const ICU = json[0].toplam_yogun_bakim
      
        const dailyTested = json[0].gunluk_test
        const dailyInfected = json[0].gunluk_vaka
        const dailyDeceased = json[0].gunluk_vefat
        const dailyRecovered = json[0].gunluk_iyilesen

        const now = new Date()

        const toInt = str => Number(str.replace('.', '').replace('.', ''))
      
        const result = {
            infected: toInt(infected),
            deceased: toInt(deceased),
            recovered: toInt(recovered),
            tested: toInt(tested),
            critical: toInt(critical),
            ICU: toInt(ICU),
            dailyTested: toInt(dailyTested),
            dailyInfected: toInt(dailyInfected),
            dailyDeceased: toInt(dailyDeceased),
            dailyRecovered: toInt(dailyRecovered),
            sourceUrl: 'https://covid19.saglik.gov.tr/covid19api?getir=sondurum',
            lastUpdatedAtApify: new Date(
              Date.UTC(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                now.getHours(),
                now.getMinutes()
              )
            ).toISOString(),
            readMe: 'https://apify.com/tugkan/covid-tr'
          }
      
        console.log(result)
      
      // Push the data
  let latest = await kvStore.getValue(LATEST)
  if (!latest) {
    await kvStore.setValue('LATEST', result)
    latest = result
  }
  delete latest.lastUpdatedAtApify
  const actual = Object.assign({}, result)
  delete actual.lastUpdatedAtApify

  if (JSON.stringify(latest) !== JSON.stringify(actual)) {
    await dataset.pushData(result)
  }

  await kvStore.setValue('LATEST', result)
  await Apify.pushData(result)

  console.log('Done.')


    };

    // Set up the crawler, passing a single options object as an argument.
    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        handlePageFunction,
    });

    await crawler.run();
});