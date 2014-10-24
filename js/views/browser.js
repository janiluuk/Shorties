App.Views.BrowserPage = Backbone.View.extend({
    model: App.Models.Film,
    el: '#browser-content',
    events: {
        'submit #search-form': 'handleSearchFormSubmit',
        'change #search-form select': 'onSearchFieldChange',
        'change #search-form input[type="text"]': 'onSearchFieldChange',
        'change #search-form input[type="hidden"]': 'onSearchFieldChange',
        'click #loadMore' : 'onLoadMore'
    },
    initialize: function(options) {
        this.options = options;

        this.collection = options.collection;
        this.collection.options.genres.bind('all', this.setGenreDropDown, this);
        this.collection.bind('sync', this.renderResults, this);
        
        this.collection.querystate.bind('change', this.onChangeCollectionState, this);
        this.collection.querystate.bind('change:genres', this.onChangeGenre, this);
        this.collection.querystate.bind('change:durations', this.onChangeDuration, this);
        this.collection.querystate.bind('change:years', this.onChangeYear, this);
        this.collection.querystate.bind('change:q', this.onChangeText, this);
        _.bindAll(this,'render', 'renderResults', 'applyIsotope');
        this.filterview = new App.Views.FilterView({filters: this.options.filters, sort: this.options.sort, state: this.collection.querystate});
        this.filterview.bind('filter-bar:sort', this.onSort, this);
        var querystring = this.collection.querystate.getQueryString();
        if (querystring != "") this.collection.update();
        this.initEvents();

    },
     initEvents: function() { 

        this.on("maximize", function() {  $("#front-page-slider").stop().slideDown(); } );
        this.on("minimize", function() {  $("#front-page-slider").stop().slideUp(); } );

    },
    render: function() {

        this.$el.html(ich.browserPageTemplate());
        this.filterview.render();
        this.applyIsotope();


        return this;  
    },
    applyIsotope: function() {
        /* Enable isotope on the results */

        this.$isotope = $("#content-body-list").isotope({
            layoutMode: 'fitRows',
            resizable: true,
            itemSelector: '.item',
            transitionDuration: '.3s',
            animationOptins: {
                duration: 250,
                easing: 'linear',
                queue: false,
            }
        });

    
        return true;
    },

    setGenreDropDown: function(action) {
        $('#id_genres').empty();
        if (this.collection.options.genres.length > 0) {
            if (this.collection.options.genres.length > 1) {
                $('#id_genres').append(new Option('All Genres', ''));
            }
            _.each(this.collection.options.genres.models, function(genre, key, list) {  
                $('#id_genres').append(new Option(genre.get("name"), genre.get("id")));
            });
            this.$('#id_genres option[value="' + this.collection.querystate.get('genres') + '"]').attr('selected', 'selected');
        }
    },
    redirectToBaseURL: function() {
        window.location = 'http://' + window.location.host + '/#search/' + this.collection.querystate.getHash();
    },
    onChangeDuration: function(model, duration) {
        //This is a state change event, not a dom event
        if (this.options.redirect_on_duration_change && duration != this.collection.initial_search.duration) {
            this.redirectToBaseURL();
        }
    },
    onChangePeriod: function(model, period) {
        //This is a state change event, not a dom event
        if (this.options.redirect_on_period_change && period != this.collection.initial_search.period) {
            this.redirectToBaseURL();
        }
    },
    onSort: function(field, desc) {

        this.collection.sortByAttribute(field, desc);
        $("#content-body-list").empty();
        this.renderResults();
        return false;

    },
   
    onChangeGenre: function(model, genre) {
        // this function is a model state change, not the dom event: change
        // because of this we don't need the "event" arg.
        var parts = app.homepage.collection.querystate.get('genres');
                if (undefined == parts || parts.length == 0) return false;
        _.each(parts.split(";"), function(i) { $(".selection-wrapper [data-val="+i+"]")});
        if (this.options.redirect_on_genre_change && genre != this.collection.initial_search.genre) {
            this.redirectToBaseURL();
        }
    },
    onChangeText:function(item) {
        //console.log(item);


    },
    handleSearchFormSubmit: function(event) {
        event.preventDefault();
    },
    loadBrowserImages: function() {
        $("#content-body-list div.lazy").lazyload({
            threshold: 4000,
            effect: 'fadeIn',
            effectspeed: 900
        });
    },
    
    // Handle preloading imags on browser
    onBrowserPaginationEvent: function(e) {
        var images = $("#content-body-list div.lazy.loading:in-viewport");
        if (images.length > 0) app.browser.loadBrowserImages();
    },
    onSearchFieldChange: function(event) {

        var value = $("#main-search-box").val();

        var search_array = {
            genres: undefined,
            duration: undefined,
            periods: undefined,
            q: value
        };
        var search_dict = _.extend({}, search_array);

        $("#search-form select :selected").each(function() {
            var fieldid = $(this).parent().attr("id");
            var fieldname = fieldid.replace("id_", "");
            var val = $(this).val();
            search_dict[fieldname] = search_dict[fieldname] == undefined ? val : search_dict[fieldname] += ";" + val;
        });

        this.collection.querystate.set(search_dict);

    },

    addOne : function ( item ) {

        var view = new App.Views.FilmView({model:item});
        var el = view.render().el;
        this.$isotope.append(el).isotope('insert', el);
    },
    addSet : function ( collection ) {
        var _this = this;

        collection.each(function(film, id) { 
            _this.addOne(film);

        });


        this.$isotope.isotope("layout");

    },
    onLoadMore: function() {

        this.addSet(this.collection.getNextPage());
        if (!app.homepage.collection.hasNextPage()) {

            $("#loadMore").hide();

        }
    },

    renderResults: function(el) {

        if (this.rendering) return false;
        this.rendering = true;
        

        //$("#content-body-list > div.movie").addClass("loading");
        $("#content-body-list").empty();

        this.collection.getFirstPage();
        this.addSet(this.collection);
        this.updateUIToState();

        this.rendering = false;
    },
    updateUIToState: function() {
        var state = this.collection.querystate;
        // main search text box
        var query = state.get('q');

        $('#main-search-box').val(query);

        this.filterview.updateUI();

        // Load more button
        if (this.collection.state.pageSize > this.collection.models.length) {
            $("#loadMore").hide();
        } else {
            $("#loadMore").show();

        }
    },

    onChangeCollectionState: function(state) {
        
        var changed_keys = _.keys(state.changedAttributes());
        var genre_is_changed = _.contains(changed_keys, 'genres');
        if (this.options.redirect_on_genre_change && (genre_is_changed)) {
            return this.redirectToBaseURL();
        }
        _.extend(this.collection.queryParams, this.collection.querystate.attributes);        
        //Update the url of the browser using the router navigate method
        app.router.navigate('search' + '?' + app.homepage.collection.querystate.getHash(), {trigger:true});
    },

    //Set the search state from the url
    setSearchStateFromHash: function(searchStateHash) {
        //setFromHash will trigger a change event, which then
        //loads the records and reloads the table
        this.collection.querystate.setFromHash(searchStateHash);
    },
    clearSearch: function() {
        this.collection.querystate.set(this.collection.initial_search);
        this.trigger("search:clear", this);
    }
});
