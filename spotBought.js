#!/usr/bin/env node

const spotify = require('spotify-node-applescript');
const fetch = require("node-fetch");
const cliProgress = require('cli-progress');
var argv = require('minimist')(process.argv.slice(2));
const chalk = require('chalk')
require('dotenv').config()

// GLOBAL CHALK VAR
const error = chalk.bold.red
const friendly = chalk.bold.blue
const green = chalk.bold.green 

const progressBar = new cliProgress.SingleBar({
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
});

if (argv.h || argv.help){
    console.log(friendly(`spotbought captures your currently playing spotify album and then queries the discogs.com marketplace for available copies.
    use the '-c' flag to set currency value (ie USD, CAD, JPY). 
    `));
    return
}

spotify.getTrack(function(err, track){
    if(!track){
        console.log(error('unable to capture currently playing track'));
        return 
    }

    let [artist, album] = [track.artist, track.album]
    if(err){
        console.log(error("encountered an error :(", err));
    } else {
        console.log(friendly(`Querying discogs database for ${album}`));
        progressBar.start(100, 0, {
            speed: "N/A"
        });
        fetch(`https://api.discogs.com/database/search?artist=${artist}&release_title=${album}&key=${process.env.KEY}&secret=${process.env.SECRET}`)
            .then(resp => resp.json())
            .then(query => {
                progressBar.increment(100)
                progressBar.stop()
                if(query.results[0]){
                    console.log(friendly('querying discogs marketplace for available copies'))
                    progressBar.start(100, 0, {
                        speed: "N/A"
                    });
                    fetch(`https://api.discogs.com/marketplace/stats/${query.results[0].master_id}?curr_abbr=${argv.c ? argv.c : 'USD'}`)
                        .then(resp => resp.json())
                        .then(stats => {
                            progressBar.increment(100)
                            progressBar.stop()
                            let outputStr; 
                            if(stats.num_for_sale > 0){
                                const URL = `https://www.discogs.com/sell/list?master_id=${query.results[0].master_id}`
                                outputStr = `There ${stats.num_for_sale == 1 ? 'is' : 'are'} currently ${stats.num_for_sale} ${stats.num_for_sale == 1 ? 'copy' : 'copies'} of ${album} for sale, with a low price of ${stats.lowest_price.value} ${stats.lowest_price.currency}.`
                                const linkStr = `Here is a link to the album's listings on Discogs' marketplace : ${URL}`
                                console.log(friendly(outputStr));
                                console.log(green(linkStr));
                            } else {
                                outputStr = 
                                `Looks like there aren't any copies of ${album} for sale on the discogs marketplace :/`
                                console.log(error(outputStr))
                            }
                            
                        })
                } else {
                    progressBar.stop()
                    console.log(`looks like we couldnt find any listings for ${album} on discogs :(`);
                }
            })
    }

});