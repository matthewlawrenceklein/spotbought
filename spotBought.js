require('dotenv').config()
const spotify = require('spotify-node-applescript');
const fetch = require("node-fetch");
const cliProgress = require('cli-progress');
var argv = require('minimist')(process.argv.slice(2));
const chalk = require('chalk')
const key = process.env.KEY
const secret = process.env.SECRET

// GLOBAL CHALK VAR
const error = chalk.bold.red
const friendly = chalk.bold.blue

const progressBar = new cliProgress.SingleBar({
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
});

if (argv.h || argv.help){
    console.log('spot bought is a buddy');
    return
}

spotify.getTrack(function(err, track){

    let [artist, album] = [track.artist, track.album]
    console.log(friendly(`Listening to ${album} by ${artist}`));
    if(err){
        console.log(error("encountered an error :(", err));
    } else {
        progressBar.start(100, 0, {
            speed: "N/A"
        });
        console.log(friendly(`Querying discogs for ${album}`));
        fetch(`https://api.discogs.com/database/search?artist=${artist}&release_title=${album}&key=${key}&secret=${secret}`)
            .then(resp => resp.json())
            .then(query => {
                progressBar.increment(100)
                if(query.results[0]){
                    const release_id = query.results[0].master_id
                    fetch(`https://api.discogs.com/marketplace/stats/${release_id}?curr_abbr=${argv.c ? argv.c : 'USD'}`)
                        .then(resp => resp.json())
                        .then(stats => {
                            progressBar.stop()
                            const URL = `https://www.discogs.com/sell/list?master_id=${release_id}&format=Vinyl`
                            const outputStr = 
`There are currently ${stats.num_for_sale} copies of ${album} for sale, with a low price of ${stats.lowest_price.value} ${stats.lowest_price.currency}. \n 
Here is a link to the album's vinyl listings on Discogs' marketplace : ${URL}                  
`
                            console.log(outputStr);
                        })
                } else {
                    progressBar.stop()
                    console.log(`looks like we couldnt find any listings for ${album} on discogs :(`);
                }
            })
    }

});