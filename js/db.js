import { PrivateFireClient } from './pf-sdk.js';

// Konfiguriere deinen PrivateFire Client
const pf = new PrivateFireClient({
  host: 'https://privatefire-ric.duckdns.org',
  apiKey: 'pfk_e014d885d19842368f11d6dfdd8c4ecf' // <-- eingefügt
});

// App-Name für die Datenbank (muss exakt dem Namen im Dashboard entsprechen)
const APP_NAME = 'shopplist';

// Hilfsfunktionen für Mengenzusammenführung
export function parseAmount(amountStr) {
    if (!amountStr) return { value: 0, unit: '' };
    const str = amountStr.toString().trim();
    // Regex: Sucht nach Zahlen (auch mit Komma/Punkt) am Anfang und dem Rest als Einheit
    const match = str.match(/^([\d.,]+)\s*(.*)$/);
    if (match) {
        return { 
            value: parseFloat(match[1].replace(',', '.')), 
            unit: match[2].toLowerCase().trim() 
        };
    }
    // Wenn keine Zahl am Anfang steht (z.B. "Ein Bund")
    return { value: 0, unit: str };
}

export function formatAmount(value, unit) {
    if (value === 0) return unit;
    // .replace(/\.0$/, "") entfernt unnötige ".0"
    const valStr = value.toString().replace(/\.0$/, "");
    return unit ? `${valStr} ${unit}` : valStr;
}

// -------------------------------------------------------------
// Einkaufsliste API
// -------------------------------------------------------------
export async function getShoppingList() {
    try {
        // Hole Liste sortiert nach order_index
        const res = await pf.db.select(APP_NAME, 'shopping_list', { order: 'order_index:asc' });
        return res.data || [];
    } catch (err) {
        console.error("❌ Fehler beim Abfragen der Liste (PrivateFire):", err);
        return [];
    }
}

export async function addOrUpdateListItem(name, amountStr, category = "sonstiges") {
    try {
        // 1. Prüfen, ob der Artikel schon existiert und nicht abgehakt ist
        const checkRes = await pf.db.select(APP_NAME, 'shopping_list', {
            ilike: [`name:${name}`],
            eq: ['is_checked:false']
        });
        const existingItems = checkRes.data || [];

        if (existingItems && existingItems.length > 0) {
            // Zusammenführen
            const existing = existingItems[0];
            const newAmt = parseAmount(amountStr);
            const oldAmt = parseAmount(existing.amount);

            if (newAmt.unit === oldAmt.unit) {
                const combinedValue = oldAmt.value + newAmt.value;
                const newAmountStr = formatAmount(combinedValue, newAmt.unit);
                
                const updateRes = await pf.db.update(APP_NAME, 'shopping_list', { eq: [`name:${existing.name}`] }, { amount: newAmountStr });
                return updateRes.data ? updateRes.data[0] : null;
            }
        }

        // Wenn nicht existiert: Neu anlegen
        // Höchsten order_index holen
        const currentRes = await pf.db.select(APP_NAME, 'shopping_list', { order: 'order_index:desc', limit: 1 });
        const currentItems = currentRes.data || [];
        
        let nextIndex = 0;
        if (currentItems && currentItems.length > 0) {
            nextIndex = (currentItems[0].order_index || 0) + 1;
        }

        const insertRes = await pf.db.insert(APP_NAME, 'shopping_list', {
            name: name, amount: amountStr || '', is_checked: false, category: category, order_index: nextIndex
        });
        
        return insertRes.data;
    } catch (err) {
        console.error("❌ Fehler beim Hinzufügen (PrivateFire):", err);
        alert(`Ein Fehler ist aufgetreten: ${err.message}. Hast du den pf.apiKey in db.js richtig eintragen?`);
        return null;
    }
}

export async function toggleListItem(name, is_checked) {
    try {
        const res = await pf.db.update(APP_NAME, 'shopping_list', { eq: [`name:${name}`] }, { is_checked: is_checked });
        return res.data ? res.data[0] : null;
    } catch (err) { return null; }
}

export async function deleteListItem(name) {
    try {
        await pf.db.delete(APP_NAME, 'shopping_list', { eq: [`name:${name}`] });
        return true;
    } catch (err) { return false; }
}

export async function clearList() {
    try {
        await pf.db.delete(APP_NAME, 'shopping_list', { neq: ['name:THIS_WILL_NEVER_MATCH_SO_IT_CLEARS_ALL'] });
        return true;
    } catch (err) { return false; }
}

export async function updateOrder(itemsOrderData) {
    try {
        for (let item of itemsOrderData) {
            await pf.db.update(APP_NAME, 'shopping_list', { eq: [`name:${item.name}`] }, { order_index: item.order_index });
        }
        return true;
    } catch (err) { return false; }
}

// -------------------------------------------------------------
// Favoriten API
// -------------------------------------------------------------
export async function getFavorites() {
    try {
        const res = await pf.db.select(APP_NAME, 'favorites');
        return res.data || [];
    } catch (error) { return []; }
}

export async function toggleFavorite(name, amount) {
    try {
        const { data: existing } = await pf.db.select(APP_NAME, 'favorites', { ilike: [`name:${name}`] });
        if (existing && existing.length > 0) {
            await pf.db.delete(APP_NAME, 'favorites', { eq: [`name:${existing[0].name}`] });
            return { isFavorite: false };
        } else {
            await pf.db.insert(APP_NAME, 'favorites', { name: name, amount: amount || '' });
            return { isFavorite: true };
        }
    } catch (err) { return null; }
}

// -------------------------------------------------------------
// Rezepte API
// -------------------------------------------------------------
export async function getRecipes() {
    try {
        const res = await pf.db.select(APP_NAME, 'recipes');
        return res.data || [];
    } catch (error) { return []; }
}

export async function createRecipe(name, base_portions, ingredients) {
    try {
        const res = await pf.db.insert(APP_NAME, 'recipes', { name, base_portions: parseInt(base_portions), ingredients });
        return res.data;
    } catch (err) { return null; }
}

export async function deleteRecipe(name) {
    try {
        await pf.db.delete(APP_NAME, 'recipes', { eq: [`name:${name}`] });
        return true;
    } catch (error) { return false; }
}
