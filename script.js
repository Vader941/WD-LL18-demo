// --- DOM elements ---
const randomBtn = document.getElementById("random-btn");
const recipeDisplay = document.getElementById("recipe-display");
const remixBtn = document.getElementById("remix-btn");
const remixThemeSelect = document.getElementById("remix-theme");
const remixOutput = document.getElementById("remix-output");
const savedRecipesContainer = document.getElementById("saved-recipes-container");
const savedRecipesList = document.getElementById("saved-recipes-list");

// --- Global variables ---
let currentRecipe = null; // Store the current recipe data for remixing
let currentRemix = null; // Store the current remixed recipe data

// This function creates a list of ingredients for the recipe from the API data
// It loops through the ingredients and measures, up to 20, and returns an HTML string
// that can be used to display them in a list format
// If an ingredient is empty or just whitespace, it skips that item 
function getIngredientsHtml(recipe) {
  let html = "";
  for (let i = 1; i <= 20; i++) {
    const ing = recipe[`strIngredient${i}`];
    const meas = recipe[`strMeasure${i}`];
    if (ing && ing.trim()) html += `<li>${meas ? `${meas} ` : ""}${ing}</li>`;
  }
  return html;
}

// This function displays the recipe on the page
function renderRecipe(recipe) {
  // Store the current recipe for remixing
  currentRecipe = recipe;
  
  recipeDisplay.innerHTML = `
    <div class="recipe-title-row">
      <h2>${recipe.strMeal}</h2>
    </div>
    <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" />
    <h3>Ingredients:</h3>
    <ul>${getIngredientsHtml(recipe)}</ul>
    <h3>Instructions:</h3>
    <p>${recipe.strInstructions.replace(/\r?\n/g, "<br>")}</p>
    <button id="save-recipe-btn" class="main-btn" style="margin-top: 20px;">
      <span class="material-symbols-outlined icon-btn">bookmark_add</span>
      Save Recipe
    </button>
  `;
  
  // Add event listener to the save button
  const saveBtn = document.getElementById("save-recipe-btn");
  saveBtn.addEventListener("click", () => saveRecipe(recipe.strMeal));
}

// This function gets a random recipe from the API and shows it
async function fetchAndDisplayRandomRecipe() {
  recipeDisplay.innerHTML = "<p>Loading...</p>"; // Show loading message
  try {
    // Fetch a random recipe from the MealDB API
    const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php'); // Replace with the actual API URL
    const data = await res.json(); // Parse the JSON response
    const recipe = data.meals[0]; // Get the first recipe from the response
    
    // Display the recipe on the page
    renderRecipe(recipe);

  } catch (error) {
    recipeDisplay.innerHTML = "<p>Sorry, couldn't load a recipe.</p>";
    console.error("Error fetching recipe:", error); // Log the error to the console
  }
}

// This function sends the current recipe to OpenAI for a creative remix
async function remixRecipe() {
  // Check if we have a current recipe to remix
  if (!currentRecipe) {
    remixOutput.innerHTML = "<p>Please get a random recipe first before remixing!</p>";
    return;
  }

  // Get the selected remix theme
  const remixTheme = remixThemeSelect.value;
  
  // Show loading message
  remixOutput.innerHTML = "<p>🍳 AI is cooking up your remix... Please wait!</p>";
  
  try {
    // Prepare the recipe data for the AI
    const recipeData = {
      name: currentRecipe.strMeal,
      ingredients: getIngredientsList(currentRecipe),
      instructions: currentRecipe.strInstructions
    };
    
    // Create the prompt for OpenAI
    const prompt = `Here's a recipe for ${recipeData.name}:

Ingredients: ${recipeData.ingredients.join(', ')}

Instructions: ${recipeData.instructions}

Please create a fun, creative, and totally doable remix of this recipe with the theme: "${remixTheme}". 

Provide a short response that highlights any changed ingredients or cooking instructions. Make it playful and creative while keeping it practical!`;

    // Call OpenAI's API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.8
      })
    });

    // Check if the API call was successful
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const remixedRecipe = data.choices[0].message.content;
    
    // Store the current remix data
    currentRemix = {
      originalName: currentRecipe.strMeal,
      theme: remixTheme,
      content: remixedRecipe,
      name: `${currentRecipe.strMeal} (${remixTheme})`
    };
    
    // Display the remixed recipe with save button
    remixOutput.innerHTML = `
      <h3>✨ AI Recipe Remix: "${remixTheme}"</h3>
      <div class="remix-content">
        ${remixedRecipe.replace(/\n/g, '<br>')}
      </div>
      <button id="save-remix-btn" class="accent-btn" style="margin-top: 15px;">
        <span class="material-symbols-outlined icon-btn">bookmark_add</span>
        Save This Remix
      </button>
    `;
    
    // Add event listener to the save remix button
    const saveRemixBtn = document.getElementById("save-remix-btn");
    saveRemixBtn.addEventListener("click", () => saveRemixedRecipe(currentRemix));
    
  } catch (error) {
    // Show friendly error message
    remixOutput.innerHTML = "<p>Oops! Something went wrong while creating your remix. Please try again!</p>";
    console.error("Error remixing recipe:", error);
  }
}

// Helper function to get ingredients as an array
function getIngredientsList(recipe) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = recipe[`strIngredient${i}`];
    const measure = recipe[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push(measure ? `${measure} ${ingredient}` : ingredient);
    }
  }
  return ingredients;
}

// --- Saved Recipes Functions ---

// This function saves a recipe name to local storage
function saveRecipe(recipeName) {
  // Get existing saved recipes from local storage
  let savedRecipes = JSON.parse(localStorage.getItem('savedRecipes')) || [];
  
  // Create recipe object
  const recipeData = {
    name: recipeName,
    type: 'original',
    originalName: recipeName
  };
  
  // Check if recipe is already saved
  if (savedRecipes.some(recipe => recipe.name === recipeName)) {
    alert("This recipe is already saved!");
    return;
  }
  
  // Add the new recipe to the array
  savedRecipes.push(recipeData);
  
  // Save back to local storage
  localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
  
  // Update the display
  displaySavedRecipes();
  
  // Show confirmation message
  alert(`"${recipeName}" has been saved to your favorites!`);
}

// This function saves a remixed recipe to local storage
function saveRemixedRecipe(remixData) {
  // Get existing saved recipes from local storage
  let savedRecipes = JSON.parse(localStorage.getItem('savedRecipes')) || [];
  
  // Create remix recipe object
  const recipeData = {
    name: remixData.name,
    type: 'remix',
    originalName: remixData.originalName,
    theme: remixData.theme,
    content: remixData.content
  };
  
  // Check if this exact remix is already saved
  if (savedRecipes.some(recipe => recipe.name === remixData.name)) {
    alert("This remix is already saved!");
    return;
  }
  
  // Add the new remix to the array
  savedRecipes.push(recipeData);
  
  // Save back to local storage
  localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
  
  // Update the display
  displaySavedRecipes();
  
  // Show confirmation message
  alert(`Your remixed recipe "${remixData.name}" has been saved to your favorites!`);
}

// This function displays all saved recipe names on the page
function displaySavedRecipes() {
  // Get saved recipes from local storage
  const savedRecipes = JSON.parse(localStorage.getItem('savedRecipes')) || [];
  
  // If no saved recipes, hide the container
  if (savedRecipes.length === 0) {
    savedRecipesContainer.style.display = 'none';
    return;
  }
  
  // Show the container and clear the list
  savedRecipesContainer.style.display = 'block';
  savedRecipesList.innerHTML = '';
  
  // Add each saved recipe to the list
  savedRecipes.forEach(recipe => {
    const listItem = document.createElement('li');
    
    // Handle both old format (strings) and new format (objects)
    const recipeName = typeof recipe === 'string' ? recipe : recipe.name;
    const recipeType = typeof recipe === 'string' ? 'original' : recipe.type;
    const displayName = recipeName;
    
    // Create different styling for original vs remix recipes
    const recipeIcon = recipeType === 'remix' ? '✨' : '🍽️';
    const recipeColor = recipeType === 'remix' ? '#9333ea' : '#2563eb';
    
    listItem.innerHTML = `
      <span class="recipe-name" onclick="loadSavedRecipe('${recipeName}', '${recipeType}')">
        ${recipeIcon} ${displayName}
      </span>
      <button class="delete-btn" onclick="deleteRecipe('${recipeName}')">
        Delete
      </button>
    `;
    savedRecipesList.appendChild(listItem);
  });
}

// This function deletes a recipe from local storage
function deleteRecipe(recipeName) {
  // Confirm with the user
  if (!confirm(`Are you sure you want to delete "${recipeName}" from your saved recipes?`)) {
    return;
  }
  
  // Get existing saved recipes
  let savedRecipes = JSON.parse(localStorage.getItem('savedRecipes')) || [];
  
  // Remove the recipe from the array (handle both old string format and new object format)
  savedRecipes = savedRecipes.filter(recipe => {
    const name = typeof recipe === 'string' ? recipe : recipe.name;
    return name !== recipeName;
  });
  
  // Save back to local storage
  localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
  
  // Update the display
  displaySavedRecipes();
}

// This function loads a saved recipe by name from the MealDB API or displays a saved remix
async function loadSavedRecipe(recipeName, recipeType = 'original') {
  recipeDisplay.innerHTML = "<p>Loading your saved recipe...</p>";
  
  // Get saved recipes to find the full data
  const savedRecipes = JSON.parse(localStorage.getItem('savedRecipes')) || [];
  const savedRecipe = savedRecipes.find(recipe => {
    const name = typeof recipe === 'string' ? recipe : recipe.name;
    return name === recipeName;
  });
  
  // If it's a remix, display it directly
  if (savedRecipe && typeof savedRecipe === 'object' && savedRecipe.type === 'remix') {
    recipeDisplay.innerHTML = `
      <div class="recipe-title-row">
        <h2>✨ ${savedRecipe.name}</h2>
        <p class="remix-subtitle">Remixed from: ${savedRecipe.originalName}</p>
      </div>
      <h3>AI Recipe Remix: "${savedRecipe.theme}"</h3>
      <div class="remix-content-saved">
        ${savedRecipe.content.replace(/\n/g, '<br>')}
      </div>
      <button id="save-recipe-btn" class="main-btn already-saved" onclick="alert('This remix is already saved!')">
        <span class="material-symbols-outlined icon-btn">bookmark_check</span>
        Already Saved
      </button>
    `;
    
    // Clear the remix output area
    remixOutput.innerHTML = '';
    return;
  }
  
  // For original recipes, fetch from API
  try {
    // Get the original recipe name (handle both old and new formats)
    const searchName = savedRecipe && typeof savedRecipe === 'object' ? savedRecipe.originalName : recipeName;
    
    // Search for the recipe by name using MealDB API
    const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchName)}`);
    const data = await response.json();
    
    // Check if we found the recipe
    if (!data.meals || data.meals.length === 0) {
      recipeDisplay.innerHTML = "<p>Sorry, couldn't find this saved recipe. It may have been removed from the database.</p>";
      return;
    }
    
    // Display the first matching recipe
    const recipe = data.meals[0];
    renderRecipe(recipe);
    
  } catch (error) {
    recipeDisplay.innerHTML = "<p>Sorry, couldn't load your saved recipe.</p>";
    console.error("Error loading saved recipe:", error);
  }
}


// --- Event listeners ---

// When the button is clicked, get and show a new random recipe
randomBtn.addEventListener("click", fetchAndDisplayRandomRecipe);

// When the remix button is clicked, remix the current recipe
remixBtn.addEventListener("click", remixRecipe);

// When the page loads, show a random recipe right away and load saved recipes
document.addEventListener("DOMContentLoaded", () => {
  fetchAndDisplayRandomRecipe();
  displaySavedRecipes();
});