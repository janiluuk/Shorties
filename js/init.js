$(document).ready(function() {
    init();
});



window.app = _.extend({}, Backbone.Events);

    // Initialization event
    app.on('app:init', function() { 
        if (App.Settings.debug === true)
        $log("Starting at "+new Date().getTime());}
    );


    function initApp(data) {

        var deferred = new $.Deferred();

        App.Platforms.init();
        // check for hash and set state accordingly
        if (window.location.hash.indexOf('#search') != -1) {
            // start with empty state because Router will configure it later.
            var state = new App.Utils.State();

        } else {

            var state = new App.Utils.State(data.search);

        }

        app.template = new App.Utils.TemplateLoader();
        var session = new App.User.Session();
        var profile = session.get("profile");
        var genres = new App.Films.GenreCollection(data.genres);
        var banners = new App.Collections.BannerCollection(data.banners);
        var subscriptions = new App.Collections.SubscriptionCollection(data.subscriptions);
        var paymentmethods = new App.Collections.PaymentmethodCollection(data.paymentmethods);
        var usercollection = new App.Collections.UserCollection([], {session:session});
        var sessioncollection = new App.Collections.FilmSessionCollection();
        var originalCollection = new App.Collections.FilmCollection(data.results, {parse:true});

        var collection = new App.Collections.PaginatedCollection(
            originalCollection.models, {
            collection: originalCollection,
            mode: "client",
            querystate: state,
            genres: genres,
            pagination: data.pagination,
            search: data.search
        });

            
        var player = new App.Player.MediaPlayer({session: session});
	    var periods = new App.Collections.FilterCollection([{'id': '2014-2014', 'name': '2014'}, {'id': '2013-2013', 'name': '2013'}, {'id': '2000-2012', 'name': '00-ndad'},{'id': '1990-2000', 'name': '90-ndad'}, {'id': '1980-1990', 'name': '80-ndad'},{'id': '1900-1980', 'name': '60-70 ndad'} ]);
	    var durations = new App.Collections.FilterCollection([{'id': '0-30', 'name': '0-30min'}, {'id': '30-60', 'name': '30-60min'}, {'id': '60', 'name': '60+min'}]);
        var sort = new App.Collections.SortCollection([{'id': 'id', 'desc':true, 'name': 'Viimati lisatud', 'default' : true}, {'id': 'title', 'name': 'A-Z'}, {'id': 'star_rating', 'name': 'Vaadatuimad'}]);
        var eventhandler = _.extend({}, Backbone.Events);
        initFB();
        initGA();

        App.Utils.include(["popup", "helper", "menu", "player","filmitem", "profile", "page"], function() { 
            app.template.load(['film'], function () {

                window.app = new App.Views.BaseAppView({platform: App.Platforms.platform, session: session, sessioncollection: sessioncollection, profile: profile,player: player, subscriptions: subscriptions, paymentmethods: paymentmethods, template: app.template, usercollection: usercollection,  eventhandler: eventhandler, banners: banners, collection: collection, sort: sort, filters: { genres: genres, durations: durations, periods: periods}});      
                
                // Bind ready event when everything has been loaded

                app.on('app:ready', function() {
                        app.collection.querystate.setFromUrl(); 
                        app.user.updatePurchases(); 
                        if (App.Settings.debug === true) { 
                            $log("App ready, finished at "+new Date().getTime()); 
                        }
                }.bind(this));
                
                // Bind startup fail event for catching the initialization failures.

                app.on('app:fail', function() { 
                    $error("Could not startup the application!" ); 
                }.bind(this));

                window.history = Backbone.history.start();
                
                deferred.resolve(app);
                
                delete(data);

            }.bind(this)); 
        });
        return deferred.promise();
    }



function init() {
    app.trigger("app:init");
    var url = App.Settings.api_url+"search?&short=1&limit="+App.Settings.initial_film_amount+"&api_key="+App.Settings.api_key+"&jsoncallback=?";
    $.getJSON(url, function(data) { 
        $.when(initApp(data)).then(function() { 
            app.trigger("app:ready");  
            
            setTimeout(function() { 
                window.scrollTo(0,1);  
            },1000);
            
        },function() { 
            app.trigger("app:fail"); } ); 
    }.bind(this), "jsonp");

}

 function initCached() {
    var cachedUrl = "http://beta.vifi.ee/init.json";
    $.getJSON(cachedUrl, function(data) { var parsed = JSON.parse(data); initApp(parsed)}, "json");
}


/* Facebook login */

function handleSessionResponse(response) {

    //if we dont have a session (which means the user has been logged out, redirect the user)
    if (!response.authResponse) {
        return;
    }
    //if we do have a non-null response.session, call FB.logout(),
    //the JS method will log the user out of Facebook and remove any authorization cookies
    FB.logout(response.authResponse);
};

/** Init google analytics */
function initGA() {
    if (App.Settings.google_analytics_code != "") {
        (function(i, s, o, g, r, a, m) {
            i['GoogleAnalyticsObject'] = r;
            i[r] = i[r] || function() {
                (i[r].q = i[r].q || []).push(arguments)
            }, i[r].l = 1 * new Date();
            a = s.createElement(o),
                m = s.getElementsByTagName(o)[0];
            a.async = 1;
            a.src = g;

            m.parentNode.insertBefore(a, m)
        })(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');
        ga('create', App.Settings.google_analytics_code, 'auto');
        ga('send', 'pageview');
    }
}

/** Init Facebook events */

function initFB() { 

    window.fbAsyncInit = function () {

    FB.Event.subscribe('auth.statusChange', function (response) {
        $(document).trigger('fbStatusChange', response);
        
    });

    FB.init({
        appId: '169875156439063', // App ID
        channelUrl: '//beta.vifi.ee/channel.html', // Channel File
        status: true, // check login status
        cookie: true, // enable cookies to allow the server to access the session
        xfbml: true  // parse XFBML
    });

    };

    // Load the SDK Asynchronously
    (function (d) {
        var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
        if (d.getElementById(id)) {
            return;
        }
        js = d.createElement('script');
        js.id = id;
        js.async = true;
        js.src = "//connect.facebook.net/en_US/all.js";
        ref.parentNode.insertBefore(js, ref);
    }(document));

    $(document).on('fbStatusChange', function (event, data) {
        if (data.status === 'connected') {
            FB.api('/me', function (response) {
                app.fbuser.set(response);
                // Store the newly authenticated FB user
                app.session.profile.trigger("user:facebook-connect", app.fbuser);
            });
        } else {
            app.fbuser.set(app.fbuser.defaults); // Reset current FB user
        }
    });
    $(document).on('logout', function () {
        if (FB.getAccessToken() != null) {
            FB.logout();
            app.fbuser.set(app.fbuser.defaults);
        }
        app.session.logout();
        return false;
    });
    
    $(document).on('login', function () {
        app.session.reset();
        app.session.enable();
        FB.login(function(response) {

        }, {scope: 'email,publish_actions'});
        return false;
    });
}

/** Initialize Disqus if enabled */
function initDisqus() {
    if (!App.Settings.commentsEnabled) return false; 

    window.disqus_shortname = App.Settings.disqus_shortname;     

    var dso   = document.createElement("script");
    dso.type  = "text/javascript";
    dso.async = true;
    dso.src  = '//' + disqus_shortname + '.disqus.com/embed.js';
    document.getElementsByTagName('body')[0].appendChild(dso);
}

/* * * Disqus Reset Function * * */
var resetDisqus = function (newIdentifier, newUrl, newTitle, newLanguage) {
    
    DISQUS.reset({
        reload: true,
        config: function () {
            this.page.identifier = newIdentifier;
            this.page.url = newUrl;
            this.page.title = newTitle;
            this.language = newLanguage;
        }
    });
};


