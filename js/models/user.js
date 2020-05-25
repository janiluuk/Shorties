App.User = {};
App.User.Ticket = Backbone.Model.extend({

    idAttribute: 'vod_id',
    initialize: function(options) {
        _.defaults(this.attributes, {
            id: null,
            vod_id: null,
            auth_code: '',
            validto: '',
            validfrom: '',
            title: '',
            type: 'vod',
            model: 'VodTitle',
            content: {},
            playsession: {},
            user_id: false,
            isValid: false,
        });
        var _this = this;
        this.on('change:content', this.onLoadContent, this);
        this.on('change:playsession', this.onLoadPlaySession, this); 
        this.listenTo(this.playsession, 'playsession:overridden', this);

       // this.content.on('content:playsession:overridden', this.onPlaySessionOverridden, this);
       // this.content.on('content:playsession:ready', this.onPlaySessionReady, this);
    },
    parse: function(data) {
        //$log('BUILDING TICKET FROM '+JSON.stringify(data));

        if (!data.vod_id) {
            alert("Issue on importing goodness.")
        }

        if (_.has(data, 'playsession')) {
            data.playsession.vod_id = data.vod_id;
            data.playsession = new App.User.FilmSession(data.playsession, {parse:true});
            data.playsession.set("session", app.session);
        }   

    
        if (_.has(data, 'content')) {
            data.content = new App.Models.FilmContent(data.content, {parse:true});
            data.content.session_id = data.playsession.session_id;
            data.content.auth_code = data.auth_code;
            data.content.id = data.vod_id;
        }   
      
        return data;
    },
    toJSON: function(options) {
        var attrs = App.User.Ticket.__super__.toJSON.apply(this, options);
        var playsession = attrs.playsession;

        if (playsession) {
            attrs.playsession = playsession.toJSON(options);
        }
        var content = attrs.content;

        if (content) {
            attrs.content = content.toJSON(content);
        }

        return attrs;
    },
    getAgenda: function() {
        return this.get('agenda');
    },
    setAgenda: function(models, options) {
        return this.getAgenda().set(models, options);
    },

    toJSON: function() {
        var json = _.clone(this.attributes);

        if (this.playsession) {
            json.playsession = this.playsession.toJSON();
        }
        if (this.content) {
            json.content = this.content.toJSON();
        }

        return json;
    },

    onLoadPlaySession: function(data) {
        //$log("[TICKET] Loaded play session: " + JSON.stringify(data.playsession));
    },
    onLoadContent: function(data) {
        //$log("[TICKET] Loaded content: " + JSON.stringify(data.content));
    },
    

    /**
     * Gets a humanized version of dates
     *
     * @param {string} date String expression (YYYY-MM-DD HH:II:SS)
     *
     * @return {string} Date string
     */
    getValidityText: function(date) {
        if (!date) date = this.get("validto");
        if (typeof(date) != "undefined") {
            var validityTime = App.Utils.stringToDate(date);
            return App.Utils.countDownText(validityTime);
        }
        return this.get("validto");
    },

    getFilm: function() {
        var id = this.get("id");
        var film = app.collection.fullCollection.get(id);
        return film;
    },
    /**
     * Check if ticket is valid
     * @return boolean
     *
     */
    isValid: function() {
        return !this.isExpired();
    },

    /**
     * Check if ticket has expired
     * @return boolean
     *
     */
    isExpired: function(validto) {
        if (!validto) validto = this.get("validto");
        if (!App.Utils.dateExpired(validto)) {
            return false;
        }
        return true;
    },

    /**
     * Check if ticket has expired
     * @return boolean
     *
     */
    getStartTimeText: function() {

        return App.Utils.dateToHumanreadable(this.get("validfrom"));
    },

    /**
     * Check if ticket has expired
     * @return boolean
     *
     */
    getExpiryTimeText: function() {

        return App.Utils.dateToHumanreadable(this.get("validto"));
    },

    parseDateString(string) {
        var date = new Date(string);
        if (null !== date.toJSON()) {
            return date;
        }
        return false;
    },

    onPlaySessionOverridden: function() {
        this.trigger("playsession:overridden", this);
        this.stopFetchingPlaySession();
    },
    stopFetchingPlaySession: function() {

        if (this.playsession) {
            this.playsession.stopFetching();
        }
    },
    startFetchingPlaySession: function() {

        if (this.playsession && this.playsession.get("session_id") !== '') {
            this.playsession.startFetching();
        }
    },

});
/**
 * Purchases stored on the cookies
 * @param Session
 *
 */
App.User.CookiePurchases = Backbone.Model.extend({
    purchase_cookie_name: null,
    initialize: function(options) {
        _.bindAll(this, 'getPurchases', 'setPurchases', 'getNewPurchases', 'clearNewPurchases', 'removeFilm', 'cleanPurchases');
        this.cookies = options.cookies;
        this.purchase_cookie_name = App.Settings.Cookies.purchase_cookie_name;
    },
    /**
     * Check for any purchases in the cookies.
     *
     * @return Array List of films
     */
    getPurchases: function() {
        $log("Checking for new purchases");
        var films = this.getNewPurchases();
        if (typeof(films) == "undefined" || _.isEmpty(films) ||  films.length < 1) {
            $log("No new purchases");
            return [];
        }
        try { 
            var vars = atob(films);
            var film_array = JSON.parse(vars);
            $log("User has new films:" + vars);
            return film_array;
        } catch (exception) {
            $log("Invalid filmcollection:" + exception.message);
            $log("Collection content:" + vars);
        }
        return [];
    },
    /**
     * Set initial collection of films from
     * JSON array.
     *
     * @param Object of all purchases
     * @return boolean
     *
     */
    setPurchases: function(films) {
        if (!films ||  _.isEmpty(films)) {
            return false;
        }
        var cookieName = this.purchase_cookie_name;
        var encoded = btoa(JSON.stringify(films));
        if (encoded) {
            this.clearNewPurchases();
            this.cookies.add({
                name: cookieName,
                value: encoded
            })
            $log("Updated cookie purchases: " + JSON.stringify(films));
            return true;
        }
        return false;
    },
    /**
     *
     * Remove an item from purchases
     * @param id of the film
     *
     * @return array or false if not found
     */
    removeFilm: function(id) {
        var filmlist = this.getPurchases();
        if (!id || _.isEmpty(filmlist)) return false;
        var filteredlist = _.reject(filmlist, function(item) {
            if (typeof item.vod_id != "undefined") return item.vod_id == id.toString();
        });
        if (_.size(filteredlist) == _.size(filmlist)) {
            $log("Film " + id + " is not in cookies, cannot remove");
            return filmlist;
        }
        if (true === _.isEmpty(filteredlist)) {
            this.clearNewPurchases();
        } else {
            $log("Removed film " + id + " from cookies");
            this.setPurchases(filteredlist);
        }
        return filteredlist;
    },
    /**
     *
     * Clear all expired purchases from cookies
     *
     * @return array or false if not found
     *
     */
    cleanPurchases: function() {
        var _this = this;
        var films = this.getPurchases();
        if (typeof(films) == "undefined" || _.isEmpty(films)) {
            return false;
        }
        var new_list = _.reject(films, function(item) {
            if (typeof(item.valid_to) == "undefined") return true;
            if (App.Utils.dateExpired(item.valid_to)) {
                return true;
            }
            return false;
        });
        if (!_.isEmpty(new_list)) {
            _.each(new_list, function(item) { 
                _this.removeFilm(item.vod_id);
                $log("Removed #" + item.vod_id + " from cookies");
            });
        }
        return new_list;
    },
    getNewPurchases: function() {
        var cookieName = this.purchase_cookie_name;
        if (cookie = this.cookies.findByName(cookieName)) {
            return cookie.get("value");
        }
        return false;
    },
    clearNewPurchases: function() {
        $log("Clearing out all purchase cookies");
        var cookieName = this.purchase_cookie_name;
        this.cookies.deleteByName(cookieName);
        return true;
    }
}); 

App.User.Profile = App.Models.ApiModel.extend({
    path: function() {
        return "profile"
    },
    params: {},
    defaults: function() {
        return {
            "id": '',
            "user_id": false,
            "name": '',
            "lastname": '',
            "firstname": '',
            "notificationText": '',
            "email": 'anonymous@vifi.ee',
            'newsletter': '0',
            "language": "Estonian",
            "tickets": [],
            "paired_user": false,
            "purchase_history": [],
            "favorites": '',
            "profile_picture": false,
            "messages": 0,
            "role": 'Guest',
            "subscriber": 0,
            "active_sessions": []
        };
    },
    initialize: function(options) {
        _.bindAll(this, 'connectFB', 'FBcallback');
        this.session = options.session;
        this.purchases = options.purchases;
        this.session.on("change:auth_id", this.authorize, this);
        this.on("change:tickets", this.updateUserCollection, this);
        this.on("user:facebook-connect", this.connectFB, this);
        this.on("user:pair", this.pair, this);
        this.on("user:unpair", this.unpair, this);
    },
    /**
     * Set profile information gotten from FB connect.
     * @param {App.FBUser} fbuser Parameters gotten from FB Connect
     *
     * @return void
     */
    connectFB: function(fbuser) {
        var id = fbuser.get("id");
        if (id != "") {
            this.set("profile_picture", 'https://graph.facebook.com/' + id + '/picture')
            this.set("lastname", fbuser.get("last_name"));
            this.set("firstname", fbuser.get("first_name"));
            this.set("email", fbuser.get("email"));
            this.set("name", fbuser.get("name"));
            this.set("access_token", FB.getAccessToken());
            this.session.getToken(fbuser.get("email"), false, false, this.FBcallback);
        }
    },
    /**
     * Connect user to the backend. ##FIXME - Needs extra validation
     *
     * @return void
     */
    FBcallback: function() {
        var authId = this.session.get("auth_id");
        var email = this.get("email");
        if (email == "" || authId == "") {
            $log("missing params, not doing fb callback");
            return false;
        }
        var token = FB.getAccessToken();
        app.api.call(["user", "connectFB", email], {
            token: token,
            authId: authId
        }, function(data) {
            $log("Authenticating with FBToken");
        });
    },
    changePassword: function(oldpass, password) {
        if (!password) return false;
        app.api.call(["user", "changepassword", this.get("email")], {
            password: password,
            oldpassword: oldpass
        }, function(data) {
            if (data.status == "ok") {
                this.trigger("user:changepassword:success", data.message);
            } else {
                this.trigger("user:changepassword:fail", data.message);
            }
        }.bind(this));
    },
    resetPassword: function(email) {
        if (!email) return false;
        app.api.call(["user", "recovery"], {
            email: email
        }, function(data) {
            if (data.status == "ok") {
                this.trigger("user:resetpassword:success", data);
            } else {
                this.trigger("user:resetpassword:fail", data);
            }
        }.bind(this));
    },
    recoverPassword: function(email, key, password) {
        if (!password || !email || !key) return false;
        app.api.call(["user", "recovery"], {
            email: email,
            key: key,
            password: password
        }, function(data) {
            if (data.status == "ok") {
                this.trigger("user:recoverpassword:success", data);
            } else {
                this.trigger("user:recoverpassword:fail", data);
            }
        }.bind(this));
    },
    pair: function(code) {
        var email = this.get("email");
        if (email == "" || code == "") return false;
        app.api.call(["user", email, "pair", code], {}, function(res) {
            if (res.status && res.status == "ok") {
                setTimeout(function() {
                    this.trigger("user:pair:successful");
                    this.fetch();
                }.bind(this), 1500);
            }
        }.bind(this));
    },
    unpair: function(id) {
        var email = this.get("email");
        if (email == "" || id == "") return false;
        app.api.call(["user", email, "unpair", id], {}, function(res) {
            if (res.status && res.status == "ok") this.trigger("user:unpair:success")
        }.bind(this));
    },
    authorize: function() {

        if (this.session.get("auth_id") == "") {
            return false;
        }
        return this.fetch({
            success: function(data) {
                if (this.get("user_id") != "") {
                    this.session.set("user_id", this.get("user_id"));
                    this.trigger("user:profile:login", this);
                    if (app.fbuser) this.trigger("user:facebook-connect", app.fbuser);
                    $log("Logging in with user " + this.get("email"));
                    return true;
                }
            }.bind(this)
        });
    },
    deauthorize: function() {
        this.clear();
        this.fetch().done(function() {
            return false;
        }.bind(this));
    },
    /**
     * Restore default settings
     * @return {void}
     */
    clear: function() {
        this.set(this.defaults());
    },
    /**
     * Check if user has access to a item.
     *
     * @param {App.Models.Film} movie Movie
     *
     * @return boolean true if found from the user collection
     *
     */
    hasMovie: function(movie) {
        var id = movie.get("id");        
        var ticket = app.usercollection.get(id);
        if (ticket && ticket.get("vod_id")) return true;
        return false;
    },
    /**
     * If user has a movie in the purchased collection, return the session for it.
     *
     * @param id int - ID of the movie
     * @return mixed, string or false
     */
    getMovieSession: function(id) {
        var ticket = app.usercollection.get(id);
        if (ticket && ticket.playsession) {
            var session_id = ticket.playsession.get("session_id");
            return session_id;
        }
        return false;
    },
    /**
     * If user has a movie in the purchased collection, return authorization code for it.
     *
     * @param id int - ID of the movie
     * @return mixed, string or false
     */
    getMovieAuthCode: function(id) {
        var ticket = app.usercollection.get(id);
        if (ticket) {
            var code = ticket.get("auth_code");
            return code;
        }
        return false;
    },
    hasSubscription: function() { 
        return this.get("subscriber") === true ? true : false;
    },
    isAnonymous: function() {
        if (this.get("email") == "anonymous@vifi.ee") return true;
        if (this.get("role") == "" || this.get("role") == "Guest") return true;
        return false;
    },
    isRegistered: function() {
        if (this.get("role") == "Registered customer") return true;
        return false;
    },
    getRole: function() {
        return this.get("role");
    },
    hasNewsletter: function() {
        return this.get("newsletter") == "1";
    },
    getLanguage: function() {
        if (this.get("language") == "es") return "Estonian";
        else return "English";
    },
    checkPurchases: function() {
        var films = this.purchases.getPurchases();
        if (_.isEmpty(films)) return false;
        return films;
    },
    updateUserCollection: function() {
        if (!app || !app.usercollection) return false;
        var _this = this;
        var deferred = new $.Deferred();
        app.usercollection.fetch().done(function(){ 

            var tickets = _this.get("tickets");
            if (_.isEmpty(tickets)) {
                deferred.resolve(app.usercollection);
                return;
            }

            var ticketcollection = [];
            _.each(tickets, function(item) {

                if (app.usercollection.hasTicket(item)) {
                        var existing = app.usercollection.find(item.vod_id);
                        if (existing) {
                            existing.set(item);
                            existing.save();
                        }
                } else {
                    if (!_.isEmpty(item.vod_id)) {
                    app.usercollection.create(item);
                    }
                }                      
            });

            deferred.resolve(app.usercollection);

        });
        return deferred.promise();
    },
    updatePurchases: function(cb) {
        _this = this;

        var deferred = new $.Deferred();
        this.fetch().done(function() {
            _this.updateUserCollection().done(function() {
                deferred.resolve(app.usercollection);
            });

        }.bind(this));
        return deferred.promise();
    },
    purchase: function(movie) {
        this.updatePurchases().done(function() {
            if (this.hasMovie(movie)) this.trigger("purchase:successful", movie);
        }.bind(this));
    },
}); 

App.User.FBPerson = Backbone.Model.extend({
    defaults: {
        "id": "",
        "name": "",
        "first_name": "",
        "last_name": "",
        "gender": "",
        "username": "",
        "link": "",
        "locale": "",
        "timezone": ""
    }
});