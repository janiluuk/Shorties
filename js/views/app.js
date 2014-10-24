App.Views = {};

App.Views.BaseAppView = Backbone.View.extend({
    el: $("#vifi-page-container"),
    events: { 
        'change #search-form select': 'onSearchFieldChange',
        'change #search-form input[type="text"]': 'onSearchFieldChange',
        'change #main-search-box input[type="text"]': 'onSearchFieldChange',

        'change #search-form input[type="hidden"]': 'onSearchFieldChange',
        'click .goTop' : 'scrollToTop',
        'submit form#main-search-form' : 'onSearchSubmit'
    },
    scrollTop: 0,
    state: false,
    initialize: function(options) {
        this.options = options || {};
        this.session = options.session;
        this.user = options.session.get("profile");
        this.collection = options.collection;
        this.usercollection = options.usercollection;
        this.evt = options.eventhandler;
        this.template = options.template;
        this.fbuser = new App.User.FBPerson(); // Holds the authenticated Facebook user
        options.model = this.user;

        _.bindAll(this, 'render', 'showBrowserPage');
            
        this.sidemenu = new App.Views.SideMenu({model: this.user, session: this.session});

        this.topmenu = new App.Views.TopMenu({model: this.user});
        this.homepage = new App.Views.HomePage(options);
        this.render();
        this.router = new App.Router();
    },
    render: function() {
       
            this.topmenu.render();
            this.sidemenu.render(); 
            this.homepage.render();
            return this;
    },
    scrollToTop: function() { 
         this.$("#content-container").stop().animate({scrollTop : 0},800);
    },
    showMoviePage: function() {
        
        this.scrollTop = this.$("#content-container").scrollTop();
        $(".main-wrapper:not(#moviepage)").hide();

        $("#moviepage").css( { width: $("#content-container").width() } ).fadeIn();
        this.$("#content-container").scrollTop(0);

    },
    showBrowserPage: function() {
        $(".main-wrapper:not(#homepage)").hide();

        $("#homepage").css("visibility", "visible").show();
        app.homepage.browserview.filterview.filterbarview.enableCarosel();
        
        if (this.scrollTop == 0) { app.homepage.browserview.renderResults(); }
        else 
        $("#content-container").scrollTop(this.scrollTop);

        app.homepage.browserview.$isotope.isotope('layout');

    },
    
    showSearchPage: function() {
        app.homepage.browserview.collection.onSearchFieldChange();
    },
    showContentPage: function(id) {
        $(".main-wrapper:not(#contentpage)").hide();

        if (id) {
            $(".side-menu-list a.active").removeClass("active");
            $(".side-menu-list a#menu-"+id).addClass("active");

        }
        this.$("#content-container").scrollTop(0);

        $("#contentpage").show();
    }
});

App.Views.HomePage = Backbone.View.extend({
    el: $("#homepage"),
    initialize: function(options) {   
        this.browserview = new App.Views.BrowserPage({
                collection: options.collection,
                filters: options.filters,
                sort: options.sort
        });
        this.featuredview = new App.Views.FeaturedView({
            collection: options.collection.featured()
        });

    },
    render: function() {
            this.featuredview.render();
            this.browserview.render();

        return this;  
    },

});

App.Views.TopMenu = Backbone.View.extend({
    events: { 
        'submit form#main-search-form' : 'onSearchSubmit',
        'click #search-button' : 'toggleSearchBox',
        'click #menu-dragger' : 'toggleSideBar',
        'click .login' : 'login',
        'click .logout' : 'logout'
    },
    model: App.User.FBPerson,
    el: $("#top-main-toolbar"),

    initialize: function(options) {
        if (options.model) this.model = options.model;
        this.model.on('change', this.render, this);

    },
    render: function() {
        var search = this.$("#main-search-box").val();
        
        this.$el.html(ich.topmenuTemplate(this.model.toJSON()));
        
            this.$("#main-search-box").val(search);

        return this;  
    },
    login: function(e) {

        $(document).trigger("login");
        return false;
    },
    logout: function (e) {
        app.router.navigate("/", {trigger:true});
        $(document).trigger('logout');

        return false;
    },
    toggleSearchBox: function(e) {
        e.preventDefault();
        $('#toolbar-search-group').toggle({ "display": "block"}, {"display":"none"});
        return false;
    },
    toggleSideBar: function(e) {
        app.sidemenu.toggleSideBar();

        return false;

    },
   
    onSearchSubmit: function(e) {
        e.preventDefault();

        app.homepage.onSearchFieldChange(e);
        app.homepage.trigger("minimize");
        
        return false;
    },   


});

App.Views.SideMenu = Backbone.View.extend({ 
    el: $("#side-menu-container"),
    state: 'closed',
    events: { 
        'click a.register-button' : 'toggleRegisterForm',
        'click .logout' : 'logout',
        'click .btn.facebook' : 'loginFacebook',
        'submit form#user-register' : 'register',
        'submit form#user-login': 'login'
    },
    initialize: function(options) { 
        var options = options || {};
        if (options.model) this.model = options.model;
        if (options.session) this.session = options.session;

        _.bindAll(this, 'enableSideMenu', 'toggleSideBar', 'render');
        this.listenTo(this.model, "change", this.render, this);
        this.listenTo(this.session, "user:register:fail", this.onFail, this);
        this.listenTo(this.session, "user:login:fail", this.onFail, this);

        this.listenTo(this.session, "user:register:success", function(data) {
            alert("You have successfully registered!")
            return false;
        }, this);
        this.listenTo(this.session, "user:login", this.render, this);

        this.enableSideMenu();
    },
    onFail: function(data) {
        if (!data) return false;
        this.$("form .error").remove();
        var div = $("<div>").addClass("row-fluid error").html(data.message);
        this.$("form:visible:first h3").append(div);
        return false;

    },
    login: function(e) {
        e.preventDefault();
        var email = $("#login-email").val();
        var pass = $("#login-password").val();

        this.session.login(email, pass);

        return false;

    },
    logout: function(e) { 
        e.preventDefault();
        $(document).trigger("logout");
    },
    loginFacebook: function(e) { 
        e.preventDefault();
        $(document).trigger("login");
    },
    register: function(e) {
        e.preventDefault();
        var email = $("#register-email").val();
        var pass = $("#register-password").val();
        var passverify = $("#register-password-verify").val();
        if (email =="" || pass == "" || passverify == "") {  
            this.onFail({message: "Fill all the fields!"});
        } else { 
            this.session.register(email, pass);
        }
        return false;
    },
    toggleRegisterForm: function(e) {
        e.preventDefault();
        $("form#user-register, form#user-login").toggle(); 
        return false;
    },
    enableSideMenu: function() {

        window.snapper = new Snap({
            element: document.getElementById("content-container"),
            disable: 'right',
            maxPosition: 260
        });
    },
   
    toggleSideBar: function() {

        if (!window.snapper) return false;
        if ($("body").hasClass("snapjs-left")) this.state = "left"; else this.state="closed";
        if( this.state=="left" ){
                    window.snapper.close();
                    this.state = "closed";
        } else {
                    window.snapper.open('left');
                    this.state = "left";
        }

    },
    closeSideBar: function() {
        if (!window.snapper) return false;
        window.snapper.close();
        this.state = "closed";

    },
 
    render: function() {   
        this.$el.html(ich.sidemenuTemplate(this.model.toJSON()));
        return this;  
    }

});