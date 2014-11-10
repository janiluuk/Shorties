
/**
 *
 *  Vifi Media Player for HTML5
 *
 *  author: Jani Luukkanen
 *  janiluuk@gmail.com
 *
 */

App.MediaPlayer = {
    currentStream: null,
    plugin: false,
    wasMuted: false,
    bitrate: false,
    allowFastFoward: true,
    _eventsToTrack: ['error', 'finish', 'fullscreen', 'fullscreen-exit', 'progress', 'seek', 'pause', 'unload', 'resume', 'ready', 'volume'],

    init: function(playlist) {

        if (playlist) this.setPlaylist(playlist);
        var _this = this;
        this._videoElement = $("#" + this.playerId);
        if (this._videoElement.length == 0) {
          this._videoElement = $("<div>").attr("id", this.playerId).appendTo("#movie-player-container");
        } 
         var path = "js/vendor/flowplayer.min.js?" + new Date().getTime();
        // $log("Adding flowplayer path: " + path);
        $("<script />", {
            src: path,
            type: 'text/javascript'
        }).appendTo("head");


        this._createPlayer();


    },

    getCurrentTime: function() {
        if (this.plugin) 
        return this.plugin.video.time * 1000;
    },

    _createPlayer: function() {
        if (this._active) return false;
        if (!this.playlist) return false;
        var playlist = this.getPlaylist();

        var _this = this;

        this._videoElement.flowplayer({
            rtmp: App.Settings.rtmp_url,
            adaptiveRatio: false,
            playlist: [ playlist ],
            }).one('ready', function(ev, api) {
                _this.plugin = api;
                _this.active();
            api.resume();
            api.bind("pause", function(e, api) {
                _this.trigger("mediaplayer:pause");         
                 
            });
            api.bind("resume", function(e, api) {
                _this.trigger("mediaplayer:resume");         
                 
            });
        });


    },
    getPlaylist: function() {
        var items = this.generatePlaylistItem(this.currentStream.mp4);
        return items;

    },


    _playVideo: function() {
        this.currentStream = this.playlist.nextFile();

        $log(" SETTING CURRENT STREAM TO: " + this.currentStream.mp4);
        this.play();

        // this._videoElement.play();
        //this.wasMuted = this.plugin.muted;

    },

   

    stop: function(forced) {
        if (this.plugin) {
            try {
                this.plugin.pause();
                this.deactive();
                this._stopTrackingEvents();

                if (!forced) this.trigger("mediaplayer:onstop");
                else this.plugin.unload();

            } catch (e) {} // If this doesn't succeed, it doesn't matter, just die gracefully

        }
    },
    

    fastforward: function() {
        var currentTime = this.plugin.video.time;
        this.plugin.seek(currentTime + 10);
        this.trigger("mediaplayer:onfastforward");
    },
    rewind: function() {
        var currentTime = this.plugin.getTime();
        this.plugin.seek(currentTime - 10);
        this.trigger("mediaplayer:onrewind", 1);
    },

    mute: function(muted) {
        if (this.plugin) {
            // need to hold on to this so we know when we've switched state in our onvolumechange handler.
            this.wasMuted = this.plugin.getStatus().muted;
            if (!this.wasMuted) {
                this.plugin.mute();
                this.trigger("mediaplayer:onmute");

            } else {
                this.trigger("mediaplayer:onunmute");
                this.plugin.unmute();
            }
        }
    },


    playing: function() {
        var playing = (this.plugin.playing ? true : false);
        return playing;
    },

    duration: function() {
        if (_.isNaN(this.plugin.video.duration)) {
            return null;
        } else {
            return Math.floor(this.plugin.video.duration * 1000);
        }
    },


    

 
}

_.extend(App.MediaPlayer, Backbone.Events);
_.extend(App.MediaPlayer, App.Player.Platforms.Core);