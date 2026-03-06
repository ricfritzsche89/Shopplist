// Supabase Konfiguration
// ERSETZE DIESE WERTE MIT DEINEN SUPABASE PROJEKTDATEN
const SUPABASE_URL = 'https://smekuryjkncmosujlkrp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtZWt1cnlqa25jbW9zdWpsa3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTU0NzAsImV4cCI6MjA4ODM3MTQ3MH0.vuomSGVyynFa3ZAkM04YwDZcyqR76z31ijDZQYW93YE';

export const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

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
    if (!supabase) return [];
    // Hole Liste und sortiere priorisiert nach order_index
    const { data, error } = await supabase.from('shopping_list').select('*').order('order_index', { ascending: true });
    if (error) { 
        console.error("❌ Fehler beim Abfragen der Liste:", error); 
        return []; 
    }
    return data;
}

export async function addOrUpdateListItem(name, amountStr, category = "sonstiges") {
    if (!supabase) return null;
    
    // 1. Prüfen, ob der Artikel schon auf der Liste steht (und nicht abgehakt ist)
    const { data: existingItems } = await supabase
        .from('shopping_list')
        .select('*')
        .ilike('name', name)
        .eq('is_checked', false);

    if (existingItems && existingItems.length > 0) {
        // Zusammenführen aktivieren
        const existing = existingItems[0];
        const newAmt = parseAmount(amountStr);
        const oldAmt = parseAmount(existing.amount);

        // Nur zusammenführen, wenn die Einheiten gleich sind oder leer
        if (newAmt.unit === oldAmt.unit) {
            const combinedValue = oldAmt.value + newAmt.value;
            const newAmountStr = formatAmount(combinedValue, newAmt.unit);
            
            const { data, error } = await supabase
                .from('shopping_list')
                .update({ amount: newAmountStr })
                .eq('name', existing.name) // Wir updaten anhand des Namens, da id scheinbar nicht existiert
                .select();
            return data ? data[0] : null;
        }
    }

    // Wenn nicht existiert oder Einheiten nicht matchen: Neu anlegen
    // Hole den höchsten aktuellen order_index
    const { data: currentItems } = await supabase.from('shopping_list').select('order_index').order('order_index', { ascending: false }).limit(1);
    let nextIndex = 0;
    if (currentItems && currentItems.length > 0) {
        nextIndex = (currentItems[0].order_index || 0) + 1;
    }

    const { data, error } = await supabase
        .from('shopping_list')
        .insert([{ name: name, amount: amountStr || '', is_checked: false, category: category, order_index: nextIndex }])
        .select();
        
    if (error) {
        console.error("❌ Fehler beim Hinzufügen (Supabase):", error.message, error.details, error.hint);
        alert(`Ein Fehler ist beim Speichern aufgetreten: ${error.message}. Sind die Supabase Tabellen (shopping_list, favorites, recipes) angelegt und die Policies (RLS) deaktiviert/erlaubt?`);
        return null;
    }
    
    return data ? data[0] : null;
}

export async function toggleListItem(name, is_checked) {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('shopping_list')
        .update({ is_checked: is_checked })
        .eq('name', name)
        .select();
    return data ? data[0] : null;
}

export async function deleteListItem(name) {
    if (!supabase) return false;
    const { error } = await supabase.from('shopping_list').delete().eq('name', name);
    return !error;
}

export async function clearList() {
    if (!supabase) return false;
    // Da wir keine 'id' mehr haben, löschen wir einfach alle Reihen, deren 'name' nicht null ist (also alles)
    const { error } = await supabase.from('shopping_list').delete().neq('name', 'THIS_WILL_NEVER_MATCH_SO_IT_CLEARS_ALL');
    return !error;
}

export async function updateOrder(itemsOrderData) {
    // itemsOrderData = [{name: 'Brot', order_index: 0}, {name: 'Milch', order_index: 1}]
    if (!supabase) return false;
    
    // Einfacher Loop für Updates (wäre schöner als bulk, aber name als identifier geht oft nur einzeln in supabase js leicht)
    for (let item of itemsOrderData) {
        await supabase.from('shopping_list').update({ order_index: item.order_index }).eq('name', item.name);
    }
    return true;
}

// -------------------------------------------------------------
// Favoriten API
// -------------------------------------------------------------
export async function getFavorites() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('favorites').select('*');
    if (error) return [];
    return data;
}

export async function toggleFavorite(name, amount) {
    if (!supabase) return null;
    // Check if exists
    const { data: existing } = await supabase.from('favorites').select('*').ilike('name', name);
    
    if (existing && existing.length > 0) {
        // Remove favorite
        await supabase.from('favorites').delete().eq('name', existing[0].name);
        return { isFavorite: false };
    } else {
        // Add favorite
        await supabase.from('favorites').insert([{ name: name, amount: amount || '' }]);
        return { isFavorite: true };
    }
}

// -------------------------------------------------------------
// Rezepte API
// -------------------------------------------------------------
export async function getRecipes() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('recipes').select('*');
    if (error) return [];
    return data;
}

export async function createRecipe(name, base_portions, ingredients) {
    // ingredients = [{name: 'Käse', amount: '200g'}, ...]
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('recipes')
        .insert([{ name, base_portions: parseInt(base_portions), ingredients }])
        .select();
    return data ? data[0] : null;
}

export async function deleteRecipe(name) {
    if (!supabase) return false;
    const { error } = await supabase.from('recipes').delete().eq('name', name);
    return !error;
}
