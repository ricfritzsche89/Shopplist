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
const navBtnSettings = document.getElementById('btn-open-settings'); // Same ID now used in Bottom Nav
const modalSettings = document.getElementById('modal-settings');
const btnCloseSettingsModal = document.getElementById('btn-close-settings-modal');
const toggleDarkMode = document.getElementById('toggle-dark-mode');
const colorSwatches = document.querySelectorAll('.color-swatch');

// Item Actions Modal
const modalItemActions = document.getElementById('modal-item-actions');
const actionModalTitle = document.getElementById('action-modal-title');
const btnActionFav = document.getElementById('btn-action-fav');
const btnActionDelete = document.getElementById('btn-action-delete');
const btnActionCancel = document.getElementById('btn-action-cancel');

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
    if (navBtnSettings) navBtnSettings.addEventListener('click', () => modalSettings.classList.add('active'));
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

        // Using placeholder spaces for amounts/categories if they don't exist to keep the table columns aligned
        const amountDisplay = item.amount ? item.amount : '<span style="opacity:0">-</span>';
        const categoryDisplay = (item.category && item.category !== 'sonstiges') ? getCategoryName(item.category) : '<span style="opacity:0">-</span>';

        li.innerHTML = `
            ${isNotChecked ? `<div class="drag-handle" draggable="true" aria-label="Sortieren" title="Ziehen zum Sortieren">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </div>` : ''}
            <div class="item-content">
                <input type="checkbox" class="item-checkbox" ${item.is_checked ? 'checked' : ''}>
                <div class="item-table-layout">
                    <span class="item-name">${item.name}</span>
                    <span class="item-amount">${amountDisplay}</span>
                    <span class="item-badge" style="background-color: transparent; border: 1px solid var(--border); ${!(item.category && item.category !== 'sonstiges') ? 'border-color: transparent;' : ''}">${categoryDisplay}</span>
                </div>
            </div>
        `;
        
        // Drag and drop event listeners
        if (isNotChecked) {
            setupDragAndDrop(li, item);
        }

        // Long Press to open context menu
        setupLongPress(li, item);

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

        shoppingListEl.appendChild(li);
    });
}

// -------------------------------------------------------------
// Long Press Context Menu Logic
// -------------------------------------------------------------
let currentActionItem = null;
let currentActionLi = null;

function setupLongPress(element, item) {
    let pressTimer;
    let isDragging = false;
    let longPressTriggered = false;
    
    const start = (e) => {
        // Don't trigger long press if clicking directly on the checkbox or drag handle
        if(e.target.closest('.item-checkbox') || e.target.closest('.drag-handle')) return;
        
        isDragging = false;
        longPressTriggered = false;
        pressTimer = window.setTimeout(() => {
            longPressTriggered = true;
            openItemActions(item, element);
        }, 500); // 500ms long press
    };

    const cancel = () => {
        clearTimeout(pressTimer);
    };
    
    // Suppress the click that fires after a long-press touchend
    element.addEventListener('click', (e) => {
        if (longPressTriggered) {
            e.stopPropagation();
            e.preventDefault();
            longPressTriggered = false;
        }
    });

    element.addEventListener('mousedown', start, {passive: true});
    element.addEventListener('touchstart', start, {passive: true});
    element.addEventListener('mouseout', cancel);
    element.addEventListener('mouseleave', cancel);
    element.addEventListener('touchend', cancel);
    element.addEventListener('touchcancel', cancel);
    element.addEventListener('mousemove', () => { isDragging = true; cancel(); });
    element.addEventListener('touchmove', () => { isDragging = true; cancel(); }, {passive: true});
    
    // Prevent default context menu (OS right click / long press)
    element.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!isDragging) {
            longPressTriggered = true;
            openItemActions(item, element);
        }
    });
}

function openItemActions(item, liElement) {
    currentActionItem = item;
    currentActionLi = liElement;
    actionModalTitle.textContent = item.name;
    modalItemActions.classList.add('active');
    
    // Kleines haptisches Feedback, falls unterstützt
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

if (btnActionCancel) {
    btnActionCancel.addEventListener('click', () => {
        modalItemActions.classList.remove('active');
    });
}

if (btnActionDelete) {
    btnActionDelete.addEventListener('click', async () => {
        if (!currentActionItem) return;
        modalItemActions.classList.remove('active');
        if (currentActionLi) currentActionLi.style.opacity = '0.5';
        
        currentShoppingList = currentShoppingList.filter(i => i.name !== currentActionItem.name); // update optimistic
        await db.deleteListItem(currentActionItem.name);
        renderShoppingList();
    });
}

if (btnActionFav) {
    btnActionFav.addEventListener('click', async () => {
        if (!currentActionItem) return;
        modalItemActions.classList.remove('active');
        await db.toggleFavorite(currentActionItem.name, currentActionItem.amount);
        loadFavorites(); 
        
        // Show tiny tooltip or purely rely on modal feedback
        alert(currentActionItem.name + " in den Favoriten aktualisiert!");
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
        const amountDisplay = item.amount ? item.amount : '<span style="opacity:0">-</span>';
        
        li.innerHTML = `
            <div class="item-content" style="cursor: pointer;">
                <div class="item-table-layout">
                    <span class="item-name">${item.name}</span>
                    <span class="item-amount">${amountDisplay}</span>
                    <button class="btn-primary btn-add-fav" style="padding: 4px 12px; font-size: 0.875rem; border-radius: 20px;">+ Liste</button>
                </div>
            </div>
        `;

        li.querySelector('.btn-add-fav').addEventListener('click', async (e) => {
            e.stopPropagation(); // Eventuell Bubble verhindern
            const btn = li.querySelector('.btn-add-fav');
            btn.textContent = '✔';
            // standard category "sonstiges" for favorites right now
            await db.addOrUpdateListItem(item.name, item.amount, "sonstiges");
            setTimeout(() => btn.textContent = '+ Liste', 1000);
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
