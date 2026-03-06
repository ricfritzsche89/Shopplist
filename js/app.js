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
const inputItemUnit = document.getElementById('input-item-unit');
const customCategoryGroup = document.getElementById('custom-category-group');
const inputCustomCategory = document.getElementById('input-custom-category');

// Favorites modals
const modalFavActions = document.getElementById('modal-fav-actions');
const favActionModalTitle = document.getElementById('fav-action-modal-title');
const btnFavActionAdd = document.getElementById('btn-fav-action-add');
const btnFavActionDelete = document.getElementById('btn-fav-action-delete');
const btnFavActionCancel = document.getElementById('btn-fav-action-cancel');
const modalFavQuantity = document.getElementById('modal-fav-quantity');
const favQtyTitle = document.getElementById('fav-qty-title');
const favQtyAmount = document.getElementById('fav-qty-amount');
const favQtyUnit = document.getElementById('fav-qty-unit');
const btnFavQtyConfirm = document.getElementById('btn-fav-qty-confirm');
const btnFavQtyCancel = document.getElementById('btn-fav-qty-cancel');
let currentFavItem = null;

// Show/hide custom category input
inputItemCategory.addEventListener('change', () => {
    if (inputItemCategory.value === '__custom__') {
        customCategoryGroup.style.display = 'flex';
        inputCustomCategory.focus();
    } else {
        customCategoryGroup.style.display = 'none';
    }
});

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
    updateDynamicFilterChips();
    renderShoppingList();
}

// Adds filter chips for any custom categories found in the list data
const knownCategories = new Set(['all', 'obst', 'kuehl', 'trocken', 'getraenke', 'sonstiges']);

function updateDynamicFilterChips() {
    if (!categoryFiltersContainer) return;
    
    currentShoppingList.forEach(item => {
        if (!item.category) return;
        if (knownCategories.has(item.category)) return; // Skip built-in categories
        
        // Check if a chip for this category already exists
        const exists = categoryFiltersContainer.querySelector(`[data-cat="${item.category}"]`);
        if (exists) return;
        
        // Create a new chip
        const chip = document.createElement('button');
        chip.className = 'filter-chip';
        chip.setAttribute('data-cat', item.category);
        // Display name: replace underscores with spaces, capitalize
        chip.textContent = item.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        
        chip.addEventListener('click', () => {
            categoryFiltersContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeCategoryFilter = item.category;
            renderShoppingList();
        });
        
        categoryFiltersContainer.appendChild(chip);
        knownCategories.add(item.category); // Track so we don't add it twice
    });
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
let currentActionLi = null;function setupLongPress(element, item, favItem = null, mode = 'list') {
    let pressTimer = null;
    let longPressTriggered = false;
    let startX = 0;
    let startY = 0;
    const MOVE_THRESHOLD = 12; // px - ignore tiny wobbles

    function triggerAction() {
        longPressTriggered = true;
        if (mode === 'fav' && favItem) {
            currentFavItem = favItem;
            favActionModalTitle.textContent = favItem.name;
            modalFavActions.classList.add('active');
        } else if (item) {
            openItemActions(item, element);
        }
        if (navigator.vibrate) navigator.vibrate(60);
    }

    function onTouchStart(e) {
        if (e.target.closest('.item-checkbox') || e.target.closest('.drag-handle') || e.target.closest('.btn-add-fav')) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        longPressTriggered = false;
        pressTimer = setTimeout(triggerAction, 500);
    }

    function onTouchMove(e) {
        if (!pressTimer) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        // Only cancel if the finger has actually moved significantly
        if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    }

    function onTouchEnd() {
        clearTimeout(pressTimer);
        pressTimer = null;
    }

    // Mouse desktop fallback
    function onMouseDown(e) {
        if (e.button !== 0) return;
        if (e.target.closest('.item-checkbox') || e.target.closest('.drag-handle') || e.target.closest('.btn-add-fav')) return;
        startX = e.clientX;
        startY = e.clientY;
        longPressTriggered = false;
        pressTimer = setTimeout(triggerAction, 600);
    }

    function onMouseMove(e) {
        if (!pressTimer) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    }

    function onMouseUp() {
        clearTimeout(pressTimer);
        pressTimer = null;
    }

    // Suppress the click that fires right after a long-press touchend
    element.addEventListener('click', (e) => {
        if (longPressTriggered) {
            e.stopPropagation();
            e.preventDefault();
            longPressTriggered = false;
        }
    }, true); // capture phase to catch it early

    element.addEventListener('touchstart', onTouchStart, {passive: true});
    element.addEventListener('touchmove', onTouchMove, {passive: true});
    element.addEventListener('touchend', onTouchEnd, {passive: true});
    element.addEventListener('touchcancel', onTouchEnd, {passive: true});
    element.addEventListener('mousedown', onMouseDown);
    element.addEventListener('mousemove', onMouseMove);
    element.addEventListener('mouseup', onMouseUp);
    element.addEventListener('mouseleave', onMouseUp);

    // Desktop right-click
    element.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!longPressTriggered) triggerAction();
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
    const amountNum = inputItemAmount.value.trim();
    const unit = inputItemUnit.value;
    // Combine amount number + unit only if a number was entered
    const amount = amountNum ? `${amountNum} ${unit}` : '';
    
    // Resolve category: use custom input if selected, otherwise use the select value
    let category = inputItemCategory.value;
    if (category === '__custom__') {
        const customVal = inputCustomCategory.value.trim();
        category = customVal ? customVal.toLowerCase().replace(/\s+/g, '_') : 'sonstiges';
        
        // Add new option to the select dropdown for this session
        const alreadyExists = Array.from(inputItemCategory.options).some(o => o.value === category);
        if (!alreadyExists) {
            const newOption = document.createElement('option');
            newOption.value = category;
            newOption.textContent = customVal;
            const customOption = inputItemCategory.querySelector('option[value="__custom__"]');
            inputItemCategory.insertBefore(newOption, customOption);
        }
    }
    
    if (name) {
        inputItemName.value = '';
        inputItemAmount.value = '';
        inputItemCategory.value = 'sonstiges';
        customCategoryGroup.style.display = 'none';
        modalAddItem.classList.remove('active');
        
        await db.addOrUpdateListItem(name, amount, category);
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
            <div class="item-content">
                <div class="item-table-layout">
                    <span class="item-name">${item.name}</span>
                    <span class="item-amount">${amountDisplay}</span>
                    <button class="btn-primary btn-add-fav" style="padding: 4px 12px; font-size: 0.875rem; border-radius: 20px;">+ Liste</button>
                </div>
            </div>
        `;

        // Quick add button (uses saved amount)
        li.querySelector('.btn-add-fav').addEventListener('click', async (e) => {
            e.stopPropagation();
            currentFavItem = item;
            // Pre-fill amount if saved
            if (item.amount) {
                const parsed = db.parseAmount(item.amount);
                favQtyAmount.value = parsed.value || '';
                // Try to match the unit
                const unitOpts = Array.from(favQtyUnit.options).map(o => o.value);
                const matchedUnit = unitOpts.find(u => item.amount.includes(u));
                if (matchedUnit) favQtyUnit.value = matchedUnit;
            } else {
                favQtyAmount.value = '';
            }
            favQtyTitle.textContent = `Menge für "${item.name}"`;
            modalFavQuantity.classList.add('active');
        });

        // Long press for context menu
        setupLongPress(li, null, item, 'fav');

        favoritesListEl.appendChild(li);
    });
}

// Favorites Context Menu Buttons
if (btnFavActionCancel) btnFavActionCancel.addEventListener('click', () => modalFavActions.classList.remove('active'));

if (btnFavActionAdd) {
    btnFavActionAdd.addEventListener('click', () => {
        modalFavActions.classList.remove('active');
        if (!currentFavItem) return;
        // Pre-fill
        if (currentFavItem.amount) {
            const parsed = db.parseAmount(currentFavItem.amount);
            favQtyAmount.value = parsed.value || '';
            const unitOpts = Array.from(favQtyUnit.options).map(o => o.value);
            const matchedUnit = unitOpts.find(u => currentFavItem.amount.includes(u));
            if (matchedUnit) favQtyUnit.value = matchedUnit;
        } else {
            favQtyAmount.value = '';
        }
        favQtyTitle.textContent = `Menge für "${currentFavItem.name}"`;
        setTimeout(() => modalFavQuantity.classList.add('active'), 300);
    });
}

if (btnFavActionDelete) {
    btnFavActionDelete.addEventListener('click', async () => {
        modalFavActions.classList.remove('active');
        if (!currentFavItem) return;
        await db.toggleFavorite(currentFavItem.name, currentFavItem.amount);
        loadFavorites();
    });
}

// Quantity dialog confirm
if (btnFavQtyConfirm) {
    btnFavQtyConfirm.addEventListener('click', async () => {
        if (!currentFavItem) return;
        const num = favQtyAmount.value.trim();
        const unit = favQtyUnit.value;
        const amount = num ? `${num} ${unit}` : '';
        modalFavQuantity.classList.remove('active');
        await db.addOrUpdateListItem(currentFavItem.name, amount, 'sonstiges');
        await loadShoppingList();
    });
}

if (btnFavQtyCancel) {
    btnFavQtyCancel.addEventListener('click', () => {
        modalFavQuantity.classList.remove('active');
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
    loadData();
});

// -------------------------------------------------------------
// Force Reload / Cache leeren
// -------------------------------------------------------------
const btnForceReload = document.getElementById('btn-force-reload');
if (btnForceReload) {
    btnForceReload.addEventListener('click', async () => {
        btnForceReload.textContent = 'Wird geleert...';
        btnForceReload.disabled = true;

        try {
            // 1. Alle Service Worker deregistrieren
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) {
                    await reg.unregister();
                }
            }

            // 2. Alle Cache-Einträge löschen
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }

            // 3. Seite komplett neu laden (kein Cache)
            window.location.reload(true);
        } catch (err) {
            console.error('Force Reload Fehler:', err);
            window.location.reload(true);
        }
    });
}

// Startup
loadData();
