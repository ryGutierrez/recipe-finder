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

//Search Recipie
app.get('/searchRecipe', async (req, res) => {
	let keyword = req.query.recipies;
	let sql = `SELECT recipeId, recipeName,ingredients, recipe, likes, img, category 
                              FROM r_recipes 
                              WHERE recipeName LIKE ?`;

  let params = [`%${keyword}%`];
	let data = await executeSQL(sql, params);
	res.render('recipesAdmin', { 'recipes': data });        
});
//Search by Category
app.get('/searchCategory', async (req, res)=>{
	let category = req.query.category;
	let sql = `SELECT recipeId, recipeName, ingredients, recipe, likes, img, category
															  FROM r_recipes r
															  WHERE category LIKE ?`;
	let params = [`${category}`];
	let data = await executeSQL(sql, params);
	res.render('recipesAdmin', {'recipes': data});
  });
  //Reset button 
	app.get('/reset', async (req, res) =>{
	console.log("resetting...");
	if(req.session.isAdmin == 1)
		res.redirect('/recipesAdmin');
	else
		res.redirect('/recipes')
});  

//UpdateRecipie
app.get('/updateRecipeLike', isAuthenticated, async (req, res) => {
	let isLiked = await executeSQL(`SELECT COUNT(1) as count FROM r_likes WHERE recipeId = ? AND userId = ?`,
																	[req.query.recipeId, req.session.sessionUserId]);
	if(isLiked[0].count == 0) {
		console.log("adding new like...");
		await executeSQL(`INSERT INTO r_likes
											(recipeId, userId)
											VALUES
											(?, ?)`,
											[req.query.recipeId, req.session.sessionUserId]);
	} else {
		console.log("removing existing like...");
		await executeSQL(`DELETE FROM r_likes WHERE recipeId = ? AND userId = ?`,
											[req.query.recipeId, req.session.sessionUserId])
	}
	res.redirect('/recipes');
});
//UpdateReviewLike
app.get('/updateReviewLike', isAuthenticated, async (req, res) => {
	let isLiked = await executeSQL(`SELECT COUNT(1) as count FROM r_likes WHERE reviewId = ? AND userId = ?`,
																	[req.query.reviewId, req.session.sessionUserId]);
	if(isLiked[0].count == 0) {
		await executeSQL(`INSERT INTO r_likes
											(reviewId, userId)
											VALUES
											(?, ?)`,
											[req.query.reviewId, req.session.sessionUserId]);
	} else {
		await executeSQL(`DELETE FROM r_likes WHERE reviewId = ? AND userId = ?`,
											[req.query.reviewId, req.session.sessionUserId])
	}
	res.redirect('/viewRecipe/'+req.query.recipeId);
});
//viewRecipie
app.get('/viewRecipe/:id', isAuthenticated, async (req, res) => {
	let recipeInfo = await executeSQL(`SELECT r.*, username AS author
															FROM r_recipes r
															INNER JOIN r_users u ON r.userId = u.userId
															WHERE recipeId = ?`,
															[req.params.id]);
	let reviews = await executeSQL(`SELECT w.*, username as author
																	FROM r_reviews w
																	INNER JOIN r_users u ON w.userId = u.userId
																	WHERE recipeId = ?`, 
																 	[req.params.id]);
	let likes = await executeSQL(`SELECT reviewId, userId FROM r_likes`);
	res.render('viewRecipe', {"recipeInfo":recipeInfo[0], "reviews":reviews, "sessionUserId":req.session.sessionUserId, "likes":likes})
});
//editAccount
app.get('/editAccount', isAuthenticated, async (req, res) => {
	await executeSQL(`UPDATE r_users
										SET
											username = ?,
											biography = ?
										WHERE userId = ?`,
										[req.query.username, req.query.biography, req.session.sessionUserId]);
	res.redirect('/viewAccount');
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