console.log("starting script.js...");


// Event Listeners
let editRecipeLinks = document.querySelectorAll('.editLink');
for(let link of editRecipeLinks) {
	link.addEventListener("click", editRecipe);
}

console.log("test");
document.querySelector('.addLink').addEventListener('click', addRecipe);
console.log("test");


// Functions
async function addRecipe() {
	console.log("adding new recipe...");

	var myModal = new bootstrap.Modal(document.getElementById('add-modal'));
	myModal.show();
	console.log("adding new recipe...");

	let response = await fetch('/api/usernames')
	let usernames = await response.json();
	console.log("adding new recipe...");

	let modalBody = `
Recipe Name: <input type="text" name="recipeName"><br>
Recipe: 
<textarea name="recipe"></textarea><br>
Ingredients:
<textarea name="ingredients"></textarea><br>
Likes: <input type="number" min="0" name="likes"><br>
Image: <input type="text" name="img"><br>
Category:
<select name="category">
	<option value="breakfast">Breakfast</option>
	<option value="lunch">Lunch</option>
	<option value="dinner">Dinner</option>
	<option value="drinks">Drinks</option>
	<option value="dessert">Dessert</option>
</select><br>

Author:
<select name="userId">`;
	for(let username of usernames) {
		modalBody += `<option value="${username.userId}">${username.username}</option>`;
	}
	modalBody+= `
</select><br>`;

	document.querySelector(".add-body").innerHTML = modalBody;
}

async function editRecipe() {
	console.log("editing recipe...");

	var myModal = new bootstrap.Modal(document.getElementById('edit-modal'));
	myModal.show();

	let response = await fetch('/api/recipe/' + this.id);
	let recipeInfo = await response.json();
	console.log(recipeInfo);
	response = await fetch('/api/usernames')
	let usernames = await response.json();
	console.log(usernames);

	let modalBody = `
Recipe Name: <input type="text" name="recipeName" value="${recipeInfo.recipeName}"><br>
Recipe: 
<textarea name="recipe">${recipeInfo.recipe}</textarea><br>
Ingredients:
<textarea name="ingredients">${recipeInfo.ingredients}</textarea><br>
Likes: <input type="number" min="0" name="likes" value="${recipeInfo.likes}"><br>
Image: <input type="text" name="img" value="${recipeInfo.img}"><br>
Category:
<select name="category">
	<option value="breakfast"` + ((recipeInfo.category=="breakfast")?"selected":"") + `>Breakfast</option>
	<option value="lunch"` + ((recipeInfo.category=="lunch")?"selected":"") + `>Lunch</option>
	<option value="dinner"` + ((recipeInfo.category=="dinner")?"selected":"") + `>Dinner</option>
	<option value="drinks"` + ((recipeInfo.category=="drinks")?"selected":"") + `>Drinks</option>
	<option value="dessert"` + ((recipeInfo.category=="dessert")?"selected":"") + `>Dessert</option>
</select name="username"><br>

Author:
<select name="userId">`;
	for(let username of usernames) {
		modalBody += `<option value="${username.userId}"` + ((username.userId==recipeInfo.userId)?"selected":"") + `>${username.username}</option>`;
	}
	modalBody+= `
</select><br>
<input type="hidden" name="recipeId" value="${recipeInfo.recipeId}">`;

	document.querySelector(".edit-body").innerHTML = modalBody;
}