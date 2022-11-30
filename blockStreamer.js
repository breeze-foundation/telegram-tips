const breej = require('breej')
const axios = require('axios')
const api_url = 'https://api.breezechain.org';
class BlockStreamer {
    constructor() {
        this.headBlock = 0
        this.unparsedBlocks = 0
        this.fetchingBlock = false
    }

    streamBlocks (cb, timeout) {
        // Stream blocks
        let blockCountInterval = setInterval(() => {
            try {
                axios.get(api_url + '/count').then((bHeight) => {
                    if (bHeight.data.count > this.headBlock)
                        if (this.headBlock == 0) 
                            this.headBlock = bHeight.data.count
                        else
                            this.unparsedBlocks = bHeight.data.count - this.headBlock
                })
            } catch (error) { 
                console.log('error', error); 
                cb(false);
            }
            
        },3000)
    
        let blockInterval = setInterval(() => {
            if (this.unparsedBlocks > 0 && !this.fetchingBlock) {
                this.fetchingBlock = true
                breej.getBlock((this.headBlock+1), (err, newBlock) => {
                    if (err) this.fetchingBlock = false;
                    else {
                        this.headBlock++
                        this.unparsedBlocks--
                        setTimeout(() => this.fetchingBlock = false,500)
                        cb(newBlock)
                    }
                    
                })
            }
        },500)
        setTimeout(() => {
            clearInterval(blockCountInterval)
            clearInterval(blockInterval)
            cb('Rain closed!');
        }, timeout*1000);
        
        // global.intervals.push(blockCountInterval,blockInterval)
    } 
}

module.exports = BlockStreamer;