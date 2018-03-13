var express = require("express");
var app=express();
var bodyParser=require("body-parser");
var mysql = require('mysql');
var passport = require("passport");
var LocalStrategy   = require('passport-local').Strategy;
var session = require("express-session");
var dbHost = 'localhost';
var dbUser = 'root';
var flash= require("connect-flash");
var nodeadmin = require('nodeadmin');
var bcrypt = require('bcrypt');
var salt = bcrypt.genSaltSync(10);


app.use(nodeadmin(app));
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());
app.use(express.static("public"));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine", "ejs");
app.use(function(req,res,next){
    res.locals.isAuthenticated = req.isAuthenticated();
    next();
});



var con = mysql.createConnection({
  host: dbHost,
  user: 'q1w2e3r4',
  password: "haslo",
  database: "bazaprojekt"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

passport.serializeUser(function(user, done) {
	done(null, user.id);
		
});

passport.deserializeUser(function(id, done) {
	con.query("select * from Uzytkownik where id = "+id,function(err,rows){	
		done(err, rows[0]);
	});
});

//strategia rejestracji----------------------------
passport.use('local-signup', new LocalStrategy({
        usernameField : 'login',
        passwordField : 'password',
        passReqToCallback : true
    },
    function(req, login, password, done){
		var sql1="select * from Uzytkownik where login = ?"
        con.query(sql1, login ,function(err,rows){
			if (err)
                return done(err);
			 if (rows.length) {
                return done(null, false, req.flash('signupMessage', 'Uzytkownik o takim loginie istnieje już w bazie'));
                
            } else {
				// if there is no user with that email
                // create the user
                var newUserMysql = new Object();
				var adres=req.body.email;
				
				var hash = bcrypt.hashSync(password, salt);
				newUserMysql.login    = login;
                newUserMysql.password = hash;
			    
    			var sql2="INSERT INTO Adres_email (Adres_email, Host, Zweryfikowany) VALUES ('"+adres+"', 'gmail', 1 )";
    			con.query(sql2,function(err, rows){
    			    if(err) throw err;
    			    /*console.log(sql2);*/
    			});

				var sql3 = "INSERT INTO Uzytkownik (Login, Haslo, ID_Adres_email) VALUES ('" + login +"','"+ hash + "', (SELECT ID_Adres_email FROM Adres_email WHERE Adres_email='" +adres+"'));";
				/*console.log(sql3);*/
				con.query(sql3,function(err,rows){
				if(err) throw err;
				newUserMysql.id = rows.insertId;
				return done(null, newUserMysql);
				});	
            }	
		});
    }));


// strategia logowania ------------------------------------
passport.use('local-login', new LocalStrategy({
        usernameField : 'login',
        passwordField : 'password',
        passReqToCallback : true
    function(req, login, password, done) { 

         con.query("SELECT * FROM Uzytkownik WHERE login = '" + login + "'",function(err,rows){
			if (err)
                return done(err);
			if (!rows.length) {
                return done(null, false, req.flash('loginMessage', 'Nie znaleziono uzytkownika!'));
            } 
			
            if (!(bcrypt.compareSync(password, rows[0].Haslo)))
                return done(null, false, req.flash('loginMessage', 'Zle hasło!')); 

            return done(null, rows[0]);			
		
		});
}));

app.get("/", function(req,res){
    var sql="SELECT * FROM Film WHERE ID_Film >= ((SELECT max(ID_Film) FROM Film)-10);";
    con.query(sql,function(err,result){
        if(err)
        throw err;
        res.render("landing", {movies:result});
        });
});

app.get("/filmy/:id", function(req,res){
    var sql="SELECT * FROM Film WHERE ID_Film = ?";
    con.query(sql, req.params.id, function(err, rows){
        if(err){
            throw err;
        }else if(!rows.length){
            res.redirect("/filmy");
        }else{
            res.render("show", {film:rows[0]});
        }
    });
    
});

app.get("/filmy", function(req,res){
    var sql="SELECT * FROM Film;";
    con.query(sql,function(err,result){
        if(err)
        throw err;
        res.render("filmy", {movies:result});
        });
});


app.get("/filmy/dodaj", function(req,res){
   res.render("new"); 
   if(req.user)
   console.log(req.user.login + "xD");
});


app.get("/register", function(req,res){
   res.render("register", {signupMessage:req.flash("signupMessage")});
});

app.post('/register', function(){
            passport.authenticate('local-signup', {
            successRedirect : '/filmy',
            failureRedirect : '/register',
            failureFlash : true // allow flash messages
    });
});
    
app.get("/login", function(req,res){
   res.render("login", {loginMessage:req.flash("loginMessage")});
});
    
app.post('/login',
  passport.authenticate('local-login', {
        successRedirect : '/filmy',
        failureRedirect : '/login',
        failureFlash : true // allow flash messages
  }));

app.post("/filmy", function(req,res){
    var name=req.body.tytul;
    var obrazek=req.body.obrazek;
    var nowyFilm={tytul:name, obrazek:obrazek};
    var sql="INSERT INTO filmy SET ;";
    con.query(sql,nowyFilm, function(err){
       if(err)
       throw err;
    });
    
    res.redirect("/filmy");
});

app.get("/logout", function(req,res){
    req.logout();
    req.session.destroy();
    res.redirect("/");
});


app.get("/kontakt", function(req,res){
    res.render("kontakt");
});

app.listen(process.env.PORT, process.env.IP, function(){
    console.log("serwer ruszyl");

});