const express = require("express");
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();
const pool = dbConnection();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'secret code',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}));

// middleware functions
function isAuthenticated(req, res, next) {
	if(req.session.authenticated)
		next();
	else
		res.render('login');
}

//routes
app.get('/', async (req, res) => {
	res.render('login');
});

app.get('/home', async (req, res) => {
	
	res.render('home', {"authenticated":req.session.authenticated});
});

app.get('/logout', (req, res) => {
	req.session.destroy();
	res.redirect('/');
});

app.post('/login', async (req, res) => {
	let username = req.body.username;
	let password = req.body.password;
	let passwordHash = "";

	let sql = `SELECT *
						FROM r_users
						WHERE username = ?`;
	let rows = await executeSQL(sql, [username]);
	if(rows.length > 0) {
		passwordHash = rows[0].password;
	} else {
		res.render('login', {"error":"Wrong Credentials"});
	}

	const match = await bcrypt.compare(password, passwordHash);

	if(match) {
		req.session.authenticated = true;
		res.render('home', {"authenticated":true});
	} else {
		res.render('login', {"error":"Wrong Credentials"});
	}
});

app.get('/recipes', async (req, res) => {
	let sql = `SELECT recipeId, recipeName, ingredients, recipe, likes, img, category, username, r.userId
						FROM r_recipes r
						INNER JOIN r_users u
						ON r.userId = u.userId`;
	let data = await executeSQL(sql);
	res.render('recipes', {'recipes':data});
});

app.get('/recipesAdmin', async (req, res) => {
	let sql = `SELECT recipeId, recipeName, ingredients, recipe, likes, img, category, username, r.userId
						FROM r_recipes r
						INNER JOIN r_users u
						ON r.userId = u.userId`;
	let data = await executeSQL(sql);
	res.render('recipesAdmin', {'recipes':data});
});

app.post('/addRecipe', isAuthenticated, async (req, res) => {
	let data = await executeSQL(`INSERT INTO r_recipes
															(recipeName, ingredients, recipe, likes, img, category, userId)
															VALUES
															(?, ?, ?, ?, ?, ?, ?)`, 
															[req.body.recipeName,
															req.body.ingredients,
															req.body.recipe,
															req.body.likes,
															req.body.img,
															req.body.category,
															req.body.userId,
															req.body.recipeId]);
	res.redirect('/recipesAdmin');
});

app.post('/editRecipe', isAuthenticated, async (req, res) => {
	let data = await executeSQL(`UPDATE r_recipes
															SET
																recipeName = ?,
																ingredients = ?,
																recipe = ?,
																likes = ?,
																img = ?,
																category = ?,
																userId = ?
															WHERE recipeId = ?`,
														 	[req.body.recipeName,
															req.body.ingredients,
															req.body.recipe,
															req.body.likes,
															req.body.img,
															req.body.category,
															req.body.userId,
															req.body.recipeId]);
	res.redirect('/recipesAdmin');
});

app.get('/deleteRecipe/:id', isAuthenticated, async (req, res) => {
	await executeSQL(`DELETE FROM r_recipes
										WHERE recipeId = ?`, [req.params.id]);
	res.redirect('/recipesAdmin');
});

app.get('/api/recipe/:id', async (req, res) => {
	let data = await executeSQL(`SELECT recipeId, recipeName, ingredients, recipe, likes, img, category, username, r.userId
															FROM r_recipes r
															INNER JOIN r_users u
															ON r.userId = u.userId`, [req.params.id]);
	res.send(data[0]);
});

app.get('/api/usernames', async (req, res) => {
	let data = await executeSQL(`SELECT userId, username
															FROM r_users`);
	res.send(data);
}); 











app.get("/dbTest", async function(req, res){
	let sql = "SELECT CURDATE()";
	let rows = await executeSQL(sql);

	res.send(rows);
}); //dbTest

//functions
async function executeSQL(sql, params){
return new Promise (function (resolve, reject) {
pool.query(sql, params, function (err, rows, fields) {
if (err) throw err;
   resolve(rows);
});
});
}; //executeSQL
//values in red must be updated
function dbConnection(){

	const pool  = mysql.createPool({
	
		connectionLimit: 10,
		host: "wb39lt71kvkgdmw0.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
		user: "vzkqzftc5pg60uxp",
		password: "ttkur4p6ddf6dfac",
		database: "x94kx9rwgyuuy3vl"
	
	}); 
	
	return pool;

} //dbConnection

//start server
app.listen(3000, () => {
console.log("Expresss server running...")
} );