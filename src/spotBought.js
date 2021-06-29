const spotify = require('spotify-node-applescript');
const fetch = require("node-fetch");

const key = 'MjkmHtHBNMFKCWCzJyVM'
const secret = 'efUykRGJyRXlqxStkSPiPSfqKQLrxllW'


spotify.getTrack(function(err, track){
    let [artist, album] = [track.artist, track.album]
    if(err){
        console.log("theres been an error :(", err);
    } else {
        fetch(`https://api.discogs.com/database/search?artist=${artist}&release_title=${album}&key=${key}&secret=${secret}`)
            .then(resp => resp.json())
            .then(query => {
                if(query.results[0]){
                    const release_id = query.results[0].master_id
                    fetch(`https://api.discogs.com/marketplace/stats/${release_id}`)
                        .then(resp => resp.json())
                        .then(stats => {
                            const URL = `https://www.discogs.com/sell/list?master_id=${release_id}`
                            const outputStr = 
                            `There are currently ${stats.num_for_sale} copies of ${album} for sale, with a low price of ${stats.lowest_price.value} ${stats.lowest_price.currency}. \n 
                             Here is a link to the album on Discogs' marketplace : ${URL}                  
                            `
                            console.log(outputStr);
                        })
                } else {
                    console.log(`looks like we couldnt find any listings for ${album} on discogs :(`);
                }
            })
    }

});