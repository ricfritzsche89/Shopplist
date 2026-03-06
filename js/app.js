import * as db from './db.js';

// DOM Elements
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');

const shoppingListEl = document.getElementById('shopping-list');
const favoritesListEl = document.getElementById('favorites-list');
const recipesListEl = document.getElementById('recipes-list');

// Add Item
const fabAdd = document.getElementById('fab-add');
const modalAddItem = document.getElementById('modal-add-item');
const formAddItem = document.getElementById('form-add-item');
const inputItemName = document.getElementById('input-item-name');
const inputItemAmount = document.getElementById('input-item-amount');
const inputItemCategory = document.getElementById('input-item-category');
const btnCloseAddModal = document.getElementById('btn-close-add-modal');
const btnClearList = document.getElementById('btn-clear-list');

// Settings & Theme
const btnOpenSettings = document.getElementById('btn-open-settings');
const modalSettings = document.getElementById('modal-settings');
const btnCloseSettingsModal = document.getElementById('btn-close-settings-modal');
const toggleDarkMode = document.getElementById('toggle-dark-mode');
const colorSwatches = document.querySelectorAll('.color-swatch');

// Modals
const recipeModal = document.getElementById('modal-recipe');
const createRecipeModal = document.getElementById('modal-create-recipe');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCloseCreateModal = document.getElementById('btn-close-create-modal');

// Filters
const categoryFiltersContainer = document.getElementById('category-filters');
let activeCategoryFilter = 'all';

// State
let currentShoppingList = [];
let currentRecipe = null;
let currentPortions = 2;

// Load initial data
async function loadData() {
    initTheme();
    await loadShoppingList();
    loadFavorites();
    loadRecipes();
}

// -------------------------------------------------------------
// Theme Manager
// -------------------------------------------------------------
function initTheme() {
    // Load from local storage
    const savedTheme = localStorage.getItem('shopplist-dark-mode');
    const isDark = savedTheme === 'true' || (savedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
        document.body.classList.add('dark-theme');
        toggleDarkMode.checked = true;
    }

    const savedColor = localStorage.getItem('shopplist-accent-color');
    if (savedColor) {
        document.documentElement.style.setProperty('--primary', savedColor);
        colorSwatches.forEach(sw => {
            if (sw.getAttribute('data-color') === savedColor) sw.classList.add('active');
            else sw.classList.remove('active');
        });
    }
    
    // Theme Listeners
    if (btnOpenSettings) btnOpenSettings.addEventListener('click', () => modalSettings.classList.add('active'));
    if (btnCloseSettingsModal) btnCloseSettingsModal.addEventListener('click', () => modalSettings.classList.remove('active'));

    toggleDarkMode.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('shopplist-dark-mode', 'true');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('shopplist-dark-mode', 'false');
        }
    });

    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            colorSwatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            const color = swatch.getAttribute('data-color');
            document.documentElement.style.setProperty('--primary', color);
            localStorage.setItem('shopplist-accent-color', color);
        });
    });
}

// -------------------------------------------------------------
// View Navigation
// -------------------------------------------------------------
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        const targetViewId = item.getAttribute('data-target');
        views.forEach(view => {
            if(view.id === targetViewId) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });

        if(targetViewId === 'view-list') loadShoppingList();
        if(targetViewId === 'view-favorites') loadFavorites();
        if(targetViewId === 'view-recipes') loadRecipes();
    });
});

// -------------------------------------------------------------
// Category Filtering
// -------------------------------------------------------------
if (categoryFiltersContainer) {
    const chips = categoryFiltersContainer.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeCategoryFilter = chip.getAttribute('data-cat');
            renderShoppingList();
        });
    });

    // Drag to scroll for Desktop
    let isDown = false;
    let startX;
    let scrollLeft;

    categoryFiltersContainer.addEventListener('mousedown', (e) => {
        isDown = true;
        categoryFiltersContainer.style.cursor = 'grabbing';
        startX = e.pageX - categoryFiltersContainer.offsetLeft;
        scrollLeft = categoryFiltersContainer.scrollLeft;
    });
    categoryFiltersContainer.addEventListener('mouseleave', () => {
        isDown = false;
        categoryFiltersContainer.style.cursor = 'auto';
    });
    categoryFiltersContainer.addEventListener('mouseup', () => {
        isDown = false;
        categoryFiltersContainer.style.cursor = 'auto';
    });
    categoryFiltersContainer.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - categoryFiltersContainer.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-Muliplikator
        categoryFiltersContainer.scrollLeft = scrollLeft - walk;
    });
}

// -------------------------------------------------------------
// Render Einkaufsliste
// -------------------------------------------------------------
async function loadShoppingList() {
    currentShoppingList = await db.getShoppingList();
    renderShoppingList();
}

function renderShoppingList() {
    if (!currentShoppingList || (currentShoppingList.length === 0 && !db.supabase)) {
        shoppingListEl.innerHTML = '<li style="justify-content:center; color: var(--text-muted)"><i>Bitte Supabase Config in db.js hinterlegen</i></li>';
        return;
    }
    
    shoppingListEl.innerHTML = '';
    
    // Filter
    let itemsToRender = currentShoppingList;
    if (activeCategoryFilter !== 'all') {
        itemsToRender = itemsToRender.filter(i => i.category === activeCategoryFilter);
    }

    // Sort: Unchecked first (ordered by order_index), Checked last
    const unchecked = itemsToRender.filter(i => !i.is_checked).sort((a,b) => (a.order_index || 0) - (b.order_index || 0));
    const checked = itemsToRender.filter(i => i.is_checked);
    
    const sortedRenderList = [...unchecked, ...checked];

    if (sortedRenderList.length === 0) {
        shoppingListEl.innerHTML = '<p class="empty-state">Keine Einträge für diesen Filter.</p>';
        return;
    }

    sortedRenderList.forEach((item, index) => {
        const li = document.createElement('li');
        li.dataset.name = item.name;
        li.dataset.index = index;
        
        if (item.is_checked) li.classList.add('checked');
        
        // Let's create drag handle only for unchecked items
        const isNotChecked = !item.is_checked;

        li.innerHTML = `
            ${isNotChecked ? `<div class="drag-handle" draggable="true" aria-label="Sortieren" title="Ziehen zum Sortieren">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </div>` : ''}
            <div class="item-content">
                <input type="checkbox" class="item-checkbox" ${item.is_checked ? 'checked' : ''}>
                <div>
                    <span class="item-name">${item.name}</span>
                    ${item.amount ? `<span class="item-amount">${item.amount}</span>` : ''}
                    ${item.category && item.category !== 'sonstiges' ? `<span class="item-badge">${getCategoryName(item.category)}</span>` : ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-icon btn-fav" aria-label="Favorit">
                    <svg class="favorite-icon" width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
                <button class="btn-icon btn-delete" aria-label="Löschen">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        
        // Drag and drop event listeners
        if (isNotChecked) {
            setupDragAndDrop(li, item);
        }

        // Event Listeners
        const checkbox = li.querySelector('.item-checkbox');
        checkbox.addEventListener('change', async (e) => {
            const isChecked = e.target.checked;
            // Optimistic update in state
            const stateItem = currentShoppingList.find(i => i.name === item.name);
            if(stateItem) stateItem.is_checked = isChecked;
            renderShoppingList(); // Re-render moves it to bottom immediately
            
            await db.toggleListItem(item.name, isChecked);
        });

        const btnFav = li.querySelector('.btn-fav');
        btnFav.addEventListener('click', async () => {
            const res = await db.toggleFavorite(item.name, item.amount);
            if (res && res.isFavorite) {
                btnFav.querySelector('svg').classList.add('active');
            } else {
                btnFav.querySelector('svg').classList.remove('active');
            }
            loadFavorites();
        });

        const btnDel = li.querySelector('.btn-delete');
        btnDel.addEventListener('click', async () => {
            li.style.opacity = '0.5';
            currentShoppingList = currentShoppingList.filter(i => i.name !== item.name); // update optimistic
            await db.deleteListItem(item.name);
            renderShoppingList();
        });

        shoppingListEl.appendChild(li);
    });
}

function getCategoryName(id) {
    const cats = {
        'obst': 'Obst & Gem.',
        'kuehl': 'Kühl',
        'trocken': 'Trocken',
        'getraenke': 'Getränke',
        'sonstiges': 'Sonstiges'
    };
    return cats[id] || id;
}

// -------------------------------------------------------------
// Add Item (FAB & Modal)
// -------------------------------------------------------------
if(fabAdd) {
    fabAdd.addEventListener('click', () => {
        modalAddItem.classList.add('active');
        inputItemName.focus();
    });
}

if(btnCloseAddModal) {
    btnCloseAddModal.addEventListener('click', () => {
        modalAddItem.classList.remove('active');
    });
}

formAddItem.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = inputItemName.value.trim();
    const amount = inputItemAmount.value.trim();
    const category = inputItemCategory.value || 'sonstiges';
    
    if (name) {
        inputItemName.value = '';
        inputItemAmount.value = '';
        modalAddItem.classList.remove('active');
        
        // Insert DB
        await db.addOrUpdateListItem(name, amount, category);
        // Reload list
        await loadShoppingList();
    }
});

// -------------------------------------------------------------
// Clear List
// -------------------------------------------------------------
if (btnClearList) {
    btnClearList.addEventListener('click', async () => {
        if(confirm("Möchtest du die gesamte Einkaufsliste leeren? Rezepte und Favoriten bleiben erhalten.")) {
            await db.clearList();
            await loadShoppingList();
        }
    });
}

// -------------------------------------------------------------
// Drag & Drop Reordering
// -------------------------------------------------------------
let draggedItem = null;

function setupDragAndDrop(li, item) {
    li.addEventListener('dragstart', (e) => {
        draggedItem = li;
        setTimeout(() => li.classList.add('sortable-ghost'), 0);
        e.dataTransfer.effectAllowed = 'move';
    });

    li.addEventListener('dragend', () => {
        draggedItem = null;
        li.classList.remove('sortable-ghost');
    });

    li.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (!draggedItem || draggedItem === li) return;
        
        // Find position to insert
        const bounding = li.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        
        // If cursor is above middle, insert before, else after
        if (e.clientY - offset > 0 && li.nextSibling) {
            li.parentNode.insertBefore(draggedItem, li.nextSibling);
        } else {
            li.parentNode.insertBefore(draggedItem, li);
        }
    });

    li.addEventListener('drop', async (e) => {
        e.preventDefault();
        // Update Order in DB
        const allItems = Array.from(shoppingListEl.children);
        const orderData = [];
        
        // Only update order for unchecked items!
        let newIndex = 0;
        allItems.forEach(node => {
            if(!node.classList.contains('checked')) {
                const name = node.dataset.name;
                orderData.push({ name: name, order_index: newIndex });
                newIndex++;
            }
        });

        // Update local state optimistic
        orderData.forEach(o => {
            const listObj = currentShoppingList.find(i => i.name === o.name);
            if(listObj) listObj.order_index = o.order_index;
        });

        await db.updateOrder(orderData);
    });
}


// -------------------------------------------------------------
// Render Favorites
// -------------------------------------------------------------
async function loadFavorites() {
    const list = await db.getFavorites();
    const stateEl = document.getElementById('empty-favorites');
    
    favoritesListEl.innerHTML = '';
    if (!list || list.length === 0) {
        stateEl.style.display = 'block';
        return;
    }
    stateEl.style.display = 'none';

    list.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="item-content" style="cursor: pointer;">
                <div>
                    <span class="item-name">${item.name}</span>
                    ${item.amount ? `<span class="item-amount">${item.amount}</span>` : ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-primary" style="padding: 6px 12px; font-size: 0.875rem;">+ Liste</button>
            </div>
        `;

        li.querySelector('.btn-primary').addEventListener('click', async () => {
            li.querySelector('.btn-primary').textContent = '✔';
            // standard category "sonstiges" for favorites right now
            await db.addOrUpdateListItem(item.name, item.amount, "sonstiges");
            setTimeout(() => li.querySelector('.btn-primary').textContent = '+ Liste', 1000);
            loadShoppingList();
        });

        favoritesListEl.appendChild(li);
    });
}

// -------------------------------------------------------------
// Render Recipes
// -------------------------------------------------------------
async function loadRecipes() {
    const list = await db.getRecipes();
    const stateEl = document.getElementById('empty-recipes');
    
    recipesListEl.innerHTML = '';
    if (!list || list.length === 0) {
        stateEl.style.display = 'block';
        return;
    }
    stateEl.style.display = 'none';

    list.forEach(recipe => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="recipe-name">${recipe.name}</div>
            <div class="recipe-meta">Für <span class="base-port">${recipe.base_portions}</span> Portionen · ${recipe.ingredients ? recipe.ingredients.length : 0} Zutaten</div>
        `;
        li.addEventListener('click', () => openRecipe(recipe));
        recipesListEl.appendChild(li);
    });
}

// -------------------------------------------------------------
// Recipe Details & Scaling
// -------------------------------------------------------------
const portionsCountEl = document.getElementById('recipe-portions-count');
const ingredientsListEl = document.getElementById('recipe-ingredients');

function openRecipe(recipe) {
    currentRecipe = recipe;
    currentPortions = recipe.base_portions || 2;
    document.getElementById('modal-recipe-title').textContent = recipe.name;
    
    renderRecipeIngredients();
    recipeModal.classList.add('active');
}

function renderRecipeIngredients() {
    portionsCountEl.textContent = currentPortions;
    ingredientsListEl.innerHTML = '';
    
    if(!currentRecipe.ingredients) return;

    const scaleFactor = currentPortions / currentRecipe.base_portions;

    currentRecipe.ingredients.forEach(ing => {
        const li = document.createElement('li');
        
        let scaledAmountStr = ing.amount;
        const parsed = db.parseAmount(ing.amount);
        if (parsed.value > 0) {
            const newMenge = parsed.value * scaleFactor;
            const roundedMenge = Math.round(newMenge * 10) / 10;
            scaledAmountStr = db.formatAmount(roundedMenge, parsed.unit);
        }

        li.innerHTML = `
            <div class="item-content">
                <span class="item-name">${ing.name}</span>
                <span class="item-amount" data-scaled="${scaledAmountStr}">${scaledAmountStr}</span>
            </div>
        `;
        ingredientsListEl.appendChild(li);
    });
}

document.getElementById('btn-portion-inc').addEventListener('click', () => {
    currentPortions++;
    renderRecipeIngredients();
});
document.getElementById('btn-portion-dec').addEventListener('click', () => {
    if (currentPortions > 1) {
        currentPortions--;
        renderRecipeIngredients();
    }
});

btnCloseModal.addEventListener('click', () => recipeModal.classList.remove('active'));

// Add all to shopping list!
document.getElementById('btn-add-recipe-to-list').addEventListener('click', async () => {
    if (!currentRecipe || !currentRecipe.ingredients) return;
    
    const btn = document.getElementById('btn-add-recipe-to-list');
    btn.textContent = 'Füge hinzu...';
    btn.disabled = true;

    for (let ing of currentRecipe.ingredients) {
        const liNodes = Array.from(ingredientsListEl.children);
        const nameNode = Array.from(liNodes).find(n => n.querySelector('.item-name').textContent === ing.name);
        const amountStr = nameNode ? nameNode.querySelector('.item-amount').getAttribute('data-scaled') : ing.amount;
        
        // Rezepte fügen als "sonstiges" ein, oder man müsste Kategorie im Rezept sichern
        await db.addOrUpdateListItem(ing.name, amountStr, "sonstiges");
    }

    btn.textContent = 'Zutaten hinzugefügt! ✔';
    setTimeout(() => {
        recipeModal.classList.remove('active');
        btn.textContent = 'Alle Zutaten zur Liste hinzufügen';
        btn.disabled = false;
        loadShoppingList(); 
    }, 1500);
});

// -------------------------------------------------------------
// Rezeptidee Erstellen (Modal)
// -------------------------------------------------------------
document.getElementById('btn-create-recipe').addEventListener('click', () => {
    createRecipeModal.classList.add('active');
    document.getElementById('create-ingredients-list').innerHTML = '';
    addIngredientInput();
});

btnCloseCreateModal.addEventListener('click', () => createRecipeModal.classList.remove('active'));

document.getElementById('btn-add-ingredient-field').addEventListener('click', addIngredientInput);

function addIngredientInput() {
    const list = document.getElementById('create-ingredients-list');
    const div = document.createElement('div');
    div.className = 'input-group ingredient-input mb-15';
    div.innerHTML = `
        <input type="text" class="ingredient-name" placeholder="Zutat" required style="flex: 2;">
        <input type="text" class="ingredient-amount" placeholder="Menge" style="flex: 1;">
        <button type="button" class="btn-icon btn-remove" style="color:red">x</button>
    `;
    div.querySelector('.btn-remove').addEventListener('click', () => div.remove());
    list.appendChild(div);
}

document.getElementById('form-create-recipe').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('input-recipe-name').value;
    const portions = document.getElementById('input-base-portions').value;
    
    const ingredientsNodes = document.querySelectorAll('.ingredient-input');
    const ingredients = [];
    ingredientsNodes.forEach(node => {
        const iName = node.querySelector('.ingredient-name').value;
        const iAmt = node.querySelector('.ingredient-amount').value;
        if(iName) ingredients.push({ name: iName, amount: iAmt });
    });

    await db.createRecipe(name, portions, ingredients);
    
    document.getElementById('form-create-recipe').reset();
    createRecipeModal.classList.remove('active');
    loadRecipes();
});

// Refresh on focus (rudimentary realtime)
window.addEventListener('focus', () => {
    // Falls ein Filter aktiv ist, aktualisiere die DB Werte
    loadData();
});

// Startup
loadData();
