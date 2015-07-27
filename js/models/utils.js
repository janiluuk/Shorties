App.Utils = { 

    post: function(path, params, method) {
        method = method || "post"; // Set method to post by default if not specified.

        // The rest of this code assumes you are not using a library.
        // It can be made less wordy if you use one.
        var form = document.createElement("form");
        form.setAttribute("method", method);
        form.setAttribute("action", path);
        form.setAttribute("id", "payment_form");

        for(var key in params) {
            if(params.hasOwnProperty(key)) {
                var hiddenField = document.createElement("input");
                hiddenField.setAttribute("type", "hidden");
                hiddenField.setAttribute("name", key);
                hiddenField.setAttribute("value", params[key]);
                form.appendChild(hiddenField);
            }
        }
        return form;
    },

    translate: function(string) { 
        var str = _.filter(App.Translations[App.Settings.language], function(item,key) { if (key == string) return item});        
        if (!_.isEmpty(str)) return str; 
        return string;

    },
    template: function(id) {
        return _.template( $('#'+id).html());
    },

    // Icanhaz handlebars loader

    include: function(names, callback) {
        var self = this;
        var deferreds = [];
        $.each(names, function(index, name) { 
        
        deferreds.push($.ajax({ url: '/tpl/'+name+'.html', dataType: 'html', success: function(response) { 

            var items = $('<div>').html(response).find("script"); 
            items.each(function(idx,item) { 
                var id = $(item).attr("id");         
                if ($(item).hasClass("helper") === true)
                ich.addHelper(id, $(item).html(), $(item).attr("data-args") );
                else if ($(item).hasClass("partial") === true) 
                ich.addPartial(id, $(item).html());
                else
                ich.addTemplate(id, $(item).html());
            });
        }}));
        })
        $.when.apply(window, deferreds).done(callback);
    },
    
    lazyload: function() { 
        if (!App.Utils.bLazy) { 
            App.Utils.bLazy = new Blazy({ container: "#content-container", offset: 350});
        } else {
            App.Utils.bLazy.revalidate();
        }
    },

    // Underscore template loader

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
            if (!s) return false;
            var dateParts = s.split(' ')[0].split('-');
            var timeParts = s.split(' ')[1].split(':');
            return new Date(dateParts[0], dateParts[1], dateParts[2], timeParts[0], timeParts[1], 00, 0);
        },
        /* Return date as human readable format */

        dateToHumanreadable: function(s) {
            if (!s) return false;
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
        },
        dateExpired: function(date) { 
            if (!date) return false;

            var date = Date.parse(date);
            var now = new Date().getTime();

            if (date < now) return true;

            return false;
        }
};
//A utility model to track state using the hash and also generate a url
App.Utils.State = Backbone.Model.extend({

    defaults: App.Settings.Search.default_search_state,
    initialize: function(options) { 
        _.bindAll(this, 'setFromHash', 'getHash', 'setFromUrl' );
    },
    setQueryString: function(trigger) { 

        var string = this.getQueryString();
        app.router.navigate('search' + string, {
                trigger: trigger
        });
    },
    getQueryString: function(addParams) {
        var hashables = [];
        var dict = this.toJSON();
        for (key in dict) {
            if ((!_.indexOf(_.keys(this.defaults), key) || (this.defaults[key] != dict[key])) && dict[key] != undefined) {
                if (dict[key] != "") hashables.push(key + '=' + escape(dict[key]));

            }
        }

        if (addParams) {
            for (key in addParams) {
                hashables.push(key + '=' + addParams[key])
            }
        }
        var params = hashables.join('&');
        return params.length ? '?' + params : "";
    },

    isEmpty: function() {
       var len =  _.values(this.attributes).join("").length;
       return len == 0 ? true : false;
    },

    isDefault: function() {
       return _.values(this.defaults).join("") == _.values(this.attributes).join("");
    },

    setFromUrl: function() { 

        var hash = window.location.hash.replace('#search', '');
        var hash = hash.replace('#', '');
        hash = hash.split("=").join(":");

        return this.setFromHash(decodeURIComponent(hash));
    },

    //A hash to use in the url to create a bookmark or link
    //Makes somehting like prop1:value1|prop2:value2
    getHash: function() {
        return this.getQueryString().substring(1).replace(/&/g, '|').replace(/=/g, ':');
    },
    //Take a hash from the url and set the model attributes
    //Parses from the formate of prop1:value1|prop2:value2
    setFromHash: function(hash) {
        hash = hash.replace("?", "");

        if (hash.length == 0)  {  
            var size = _.size(this.changedAttributes());
            if (size > 0) this.set(this.defaults);
            return true; 
        }

        var hashables = hash.split('|');
        var dict = _.clone(this.defaults);
        var i = false;

        _.each(hashables, function(hashable) {
            var parts = hashable.split(':');
            var prop = parts[0];
            var value = parts[1];
            if (typeof(value) != "undefined") { 
                dict[prop] = value.length > 0 ? value : undefined;
            }
            if (dict[prop] == undefined && !i) {
                i = true;
            } 
        });
        this.set(dict);
        return i;
    }
});

App.Utils.Api = Backbone.Model.extend({  

    session: {},

    initialize: function(options) { 

        options = options || {};
        if (options.session) this.session = session;
        
        $.ajaxSetup({
              'error':function(res,data) { $error(data); }.bind(this)
        });
        this.on("error", this.onError);
        this.on("success", this.onSuccess);
        this.on("notice", this.onNotice);

    },
    onError: function(data) {  
        app.trigger("error", data);

    },
    onSuccess: function(data) {  
        app.trigger("success", data);

    },
    onNotice: function(data) {  
        app.trigger("notify", data);

    },
    parseResponse: function(data, callback, silent) { 
        var msg = data.message || JSON.stringify(data);

        if (!silent) { 
            if (data.status == "ok") {
                this.onSuccess(msg);
            }
            if (data.status == "error") {
                this.onError(msg);
            }
            if (data.status == "notice") {
                this.onNotice(msg);
            }
        }
        if (callback) callback(data);

    },
    post: function(action, params, callback, silent) {  

        if (_.isArray(action)) action = action.join("/");
        var sessionParams = app.session.getParams();
        params = _.extend(params, sessionParams.data);
        var url = App.Settings.api_url+action+"/?format=json&api_key="+App.Settings.api_key+"&";
        $.post(url,params, function(data) { this.parseResponse(data, callback, silent);  }.bind(this));

    },
    call: function(action, params, callback, silent) {  
        if (_.isArray(action)) action = action.join("/");
        var sessionParams = app.session.getParams();
        params = _.extend(params, sessionParams.data);
        var url = App.Settings.api_url+action+"/?format=json&callback=?&api_key="+App.Settings.api_key+"&";
        $.getJSON(url,params, function(data) {  this.parseResponse(data, callback, silent);  }.bind(this), "jsonp");
    }
}),


App.Utils.Notification = Backbone.Model.extend({ 

    initialize: function(options) {
        if (options && options.model) this.attach(options.model);
    },
    attach: function(model) {

        model.on("error", function(message, callback) { this.notify(message, "error", callback); }, this);
        model.on("notice",function(message, callback) { this.notify(message, "notice", callback); }, this);
        model.on("success", function(message, callback) { this.notify(message, "success", callback); }, this);
        model.on("flash", function(message, amount) { this.flash(message, amount); }, this);
    },
    flash: function(text, amount) {

        var msg = '<span class="flash-inactive">'+new Date().toTimeString().split(" ")[0]+":</span> "+text+"<br/>";
        if (!amount) amount = 7500;
        var actionOutputEl = document.getElementById("flash-output");
        if (actionOutputEl == null)
            actionOutputEl = $("<div>").attr("id", "flash-output").html(msg).appendTo("body");        
        else
            actionOutputEl.innerHTML += msg;

        $("#flash-output").addClass('animation').addClass('highlight');
        if (this.id) clearTimeout(this.id);

        this.id = setTimeout(function() {
            $("#flash-output").removeClass('highlight');
        }.bind(this), amount);
    },

    notify: function(message, type, callback) { 
        message = message || "Empty message";

        type = type || "notice";

            // create the notification
            var notification = new NotificationFx({

                message : '<div class="ns-thumb"><img width=64 height=64 src="/style/img/notify_'+type+'.jpg"/></div><div class="ns-content"><div class="ns-message"><div class="ns-message-container">'+message+'</div></div></div>',
                layout : 'other',
                ttl : 6000,
                effect : 'thumbslider',
                type : type, // notice, warning, error or success
                onClose : function() {
                    if (callback) callback();
                }
            });

            // show the notification
            notification.show();
    }
}, Backbone.Events);

window.tr = App.Utils.translate;

_.extend(Backbone.Validation.callbacks, {
    valid: function (view, attr, selector) {
        var $el = view.$('[name=' + attr + ']'), 
            $group = $el.closest('form');
        
        $group.removeClass('error');

        $group.find('.error-'+attr).remove();
    },
    invalid: function (view, attr, error, selector) {

        var $el = view.$('[name=' + attr + ']'), 
        $group = $el.closest('form');        
        $group.addClass('error');
        $group.find('.error-'+attr).remove();

        $group.prepend('<div class="row-fluid error error-'+attr+'">'+error+'</div>');
    }
});

Backbone.View.prototype.assign = function(view, selector) {
    view.setElement(this.$(selector)).render();
}

Backbone.View.prototype.removeOnDone = function(el, cls) { 
    if (!cls) cls = "loading";
    
    el.addClass("loading");
    el.attr("disabled", "disabled");

    app.once("all", function() { 
        $(el).attr("disabled", false);
        $(el).removeClass(cls); 
    }); 
};

Backbone.View.prototype.close = function(){
  this.remove();
  this.unbind();
  this.stopListening();

  if (this.onClose){ 
    this.onClose();
  }
};



