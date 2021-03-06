#!/usr/bin/env node

const puppeteer = require('puppeteer');
const spotify = require('spotify-node-applescript');
const fetch = require("node-fetch");
const cliProgress = require('cli-progress');
var argv = require('minimist')(process.argv.slice(2));
const chalk = require('chalk')
require('dotenv').config()


// GLOBAL CHALK VAR
const error = chalk.bold.red
const blue = chalk.bold.blue
const green = chalk.bold.green
const yellow = chalk.bold.yellow 

const progressBar = new cliProgress.SingleBar({
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
});

if (argv.h || argv.help){
    console.log(blue(`spotbought captures your currently playing spotify album and then queries the discogs.com marketplace for available copies.
    use the '-c' flag to set currency value (ie USD, CAD, JPY). 
    `));
    return
}
function getTrackData(){
    spotify.getTrack(function(err, track){
        if(!track){
            console.log(error('unable to capture currently playing track'));
            return 
        }
    
        let [artist, album] = [track.artist, track.album]
        if(err){
            console.log(error("encountered an error :(", err));
            return 
        } else {
            console.log(blue(`Querying discogs database for ${album}`));
            progressBar.start(100, 0, {
                speed: "N/A"
            });
            getDiscogsID(artist, album)
        }
    });
}

function getDiscogsID(artist, album){
    fetch(`https://api.discogs.com/database/search?artist=${artist}&release_title=${album}&key=${process.env.KEY}&secret=${process.env.SECRET}`)
                .then(resp => resp.json())
                .then(query => {
                    progressBar.increment(100)
                    progressBar.stop()
                    if(query.results[0] == undefined || query.results[0] == null){
                        progressBar.stop()
                        console.log(yellow(`looks like we couldnt find any listings for ${album} on discogs :(`));
                        return 
                    }
                    else if(query.results[0]){
                        // console.log(blue('querying discogs marketplace for available copies'))
                        // progressBar.start(100, 0, {
                        //     speed: "N/A"
                        // });
                        const URL = `https://www.discogs.com/sell/list?master_id=${query.results[0].master_id}&format=Vinyl`
                        console.log(blue('starting puppeteer session'));
                        puppeteerScrape(URL)
                    } 
                })
}

async function puppeteerScrape(URL){
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    console.log(blue('navigating to discogs marketplace'));
    await page.goto(URL);
    console.log(blue('scraping prices from listings'));
    let pricesArr = await page.$$eval(".converted_price", elements=> elements.map(item=>item.innerText))
    await browser.close()
    console.log(green('success'));
    processPrices(pricesArr)
}

function processPrices(priceArr){
    let strippedPrices = []
    let re = new RegExp('[0-9]{2,3}.[0-9]{2}')
    priceArr.map(price => {
        strippedPrices.push(parseFloat(re.exec(price)[0])) // parse dollar amount from string
    })
    const average = (array) => array.reduce((a, b) => a + b) / array.length;

    const lowPrice = strippedPrices.sort((a, b) => (a < b ? -1 : 1))[0];
    const averagePrice = average(strippedPrices)
    const highPice = strippedPrices.sort((a, b) => (a < b ? -1 : 1))[strippedPrices.length - 1]

    console.log('low', lowPrice);
    console.log('average', averagePrice);
    console.log('high', highPice);
}

function main(){
    getTrackData()
}

main()