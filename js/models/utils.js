
App.Utils = { 
    
    TemplateLoader: function () {

        this.templates = {};

        this.load = function (names, callback) {

            var deferreds = [],
                self = this;

            $.each(names, function (index, name) {
                deferreds.push($.get('tpl/' + name + '.html', function (data) {
                    self.templates[name] = data;
                }));
            });

            $.when.apply(null, deferreds).done(callback);
        };

        // Get template by name from hash of preloaded templates
        this.get = function (name) {
            return this.templates[name];
        };

    },
    convertMstoHumanReadable: function(ms, leadingZeros) {
            leadingZeros = typeof(leadingZerons) == 'undefined' ? true : !!leadingZeros // Make sure its boolean

            var x = ms / 1000
            var numSecs = seconds = Math.floor(x % 60)
            x /= 60
            var numMins = minutes = Math.floor(x % 60)
            x /= 60
            hours = Math.floor(x % 24)
            x /= 24
            days = Math.floor(x);

            var numMs = ms - (seconds * 1000);

            if (leadingZeros) {
                if (numSecs < 10) {
                    numSecs = "0" + numSecs.toString();
                }
                if (numMins < 10) {
                    numMins = "0" + numMins.toString();
                }
            }

            return {
                millis: numMs,
                seconds: numSecs,
                minutes: Math.floor(numMins),
                hours: Math.floor(hours),
                toString: function() {
                    var str = numSecs;
                    if (Math.floor(numMins))
                        str = numMins + ":" + str;
                    else
                        str = "00:" + str;
                    if (Math.floor(hours))
                        str = hours + ":" + str;
                    return str;
                }
            }
        },
        stringToDate: function(s) {
            var dateParts = s.split(' ')[0].split('-');
            var timeParts = s.split(' ')[1].split(':');
            return new Date(dateParts[0], dateParts[1], dateParts[2], timeParts[0], timeParts[1], 00, 0);
        },
        /* Return date as human readable format */

        dateToHumanreadable: function(s) {
            return s.getDate() + "." + s.getMonth() + " " + s.getHours() + ":" + ("0" + s.getMinutes()).slice(-2);
        },
        /* Return time after certain duration in minutes */
        minutesToTime: function(duration) {

            if (!duration) return false;
            var time = new Date();
            var endingtime = new Date(time.getTime() + duration * 60000);
            var endingtimestring = endingtime.getHours();
            endingtimestring += ":";
            endingtimestring += ("0" + endingtime.getMinutes()).slice(-2);
            return endingtimestring;
        }

};


//A utility model to track state using the hash and also generate a url
App.Utils.State = Backbone.Model.extend({
    defaults: {},
    getQueryString: function(addParams) {
        var hashables = [];
        var dict = this.toJSON();
        for (key in dict) {
            if ((!_.indexOf(_.keys(this.defaults), key) || (this.defaults[key] != dict[key])) && dict[key] != undefined) {
                hashables.push(key + '=' + escape(dict[key]));
            }
        }
        if (addParams) {
            for (key in addParams) {
                hashables.push(key + '=' + addParams[key])
            }
        }
        return '?' + hashables.join('&');
    },
    //A hash to use in the url to create a bookmark or link
    //Makes somehting like prop1:value1|prop2:value2
    getHash: function() {
        return this.getQueryString().substring(1).replace(/&/g, '|').replace(/=/g, ':');
    },
    //Take a hash from the url and set the model attributes
    //Parses from the formate of prop1:value1|prop2:value2
    setFromHash: function(hash) {
        var hashables = hash.replace("?", "").split('|');
        var dict = _.clone(this.defaults);
        var i = false;
        _.each(hashables, function(hashable) {
            var parts = hashable.split(':');
            var prop = parts[0];
            var value = parts[1];

            dict[prop] = value.length > 0 ? value : undefined;

            if (dict[prop] == undefined && !i) {
                i = true;
            } 

        });
        
        this.set(dict);
        return i;
        
    }
});

