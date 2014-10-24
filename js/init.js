window.app = {};

    function initApp(data) {
        // check for hash and set state accordingly

        if (window.location.hash.indexOf('#search') != -1) {
            // start with empty state because Router will configure it later.
            var state = new App.Utils.State();
            var hash = window.location.hash.replace('#search', '');
            state.setFromHash(decodeURIComponent(hash));
       
        } else {
            var state = new App.Utils.State(data.search);
        }

        app.template = new App.Utils.TemplateLoader();

        window.$log = function(log) { console.log(log); };

        App.Platforms.init();
        
        var genres = new App.Films.GenreCollection(data.genres);
        var usercollection = new App.Collections.UserCollection();

        var collection = new App.Collections.PaginatedCollection(
            data.results, {
            mode: "client",
            querystate: state,
            genres: genres,
            pagination: data.pagination,
            search: data.search
        });
        var session = new App.User.Session();
        
	    var periods = new App.Collections.FilterCollection([{'id': '2014-2014', 'name': '2014'}, {'id': '2013-2013', 'name': '2013'}, {'id': '2000-2012', 'name': '00-ndad'},{'id': '1990-2000', 'name': '90-ndad'}, {'id': '1980-1990', 'name': '80-ndad'},{'id': '1900-1980', 'name': '60-70 ndad'} ]);
	    var durations = new App.Collections.FilterCollection([{'id': '0-30', 'name': '0-30min'}, {'id': '30-60', 'name': '30-60min'}, {'id': '60', 'name': '60+min'}]);
        var sort = new App.Collections.SortCollection([{'id': 'id', 'desc':true, 'name': 'Most recent', 'default' : true}, {'id': 'title', 'name': 'A-Z'}, {'id': 'star_rating', 'name': 'Most watched'}]);
        var eventhandler = _.extend({}, Backbone.Events);
        App.Utils.include(["popup", "menu", "player","filmitem", "profile", "homepage"], function() { 

            app.template.load(['error','film'], function () {

                window.app = new App.Views.BaseAppView({session: session, template: app.template, usercollection: usercollection,  eventhandler: eventhandler, collection: collection, sort: sort, filters: { genres: genres, durations: durations, periods: periods}});      
                window.history = Backbone.history.start();
                initFB();


            }); 
        });
    }



$(document).ready(function() {

	$.getJSON("http://backend.vifi.ee/api/search?limit=500&api_key=12345&jsoncallback=?", initApp, "jsonp")

});


function handleSessionResponse(response) {

    //if we dont have a session (which means the user has been logged out, redirect the user)
    if (!response.authResponse) {
        return;
    }
    //if we do have a non-null response.session, call FB.logout(),
    //the JS method will log the user out of Facebook and remove any authorization cookies
    FB.logout(response.authResponse);
};
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
                app.session.trigger("user:facebook-connect", app.fbuser);

            });
        } else {
            app.fbuser.set(app.fbuser.defaults); // Reset current FB user
        }
 
    });

    $(document).on('logout', function () {
        if (FB.getAccessToken() != null) {
            FB.logout();
        }
        app.session.logout();
        
        return false;
    });
    
    $(document).on('login', function () {
        app.session.enable();

        FB.login(function(response) {
        }, {scope: 'email,publish_actions'});
        return false;
    });
}