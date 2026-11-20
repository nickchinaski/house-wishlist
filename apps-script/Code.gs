/**
 * New Home Shopping List — Google Apps Script backend.
 * Data lives in this Google Sheet (tabs "Items", "Settings", "Summary").
 * Link auto-filing uses the Gemini API (Flash-Lite by default).
 * Setup steps are in ISTRUZIONI.md.
 */

var ROOMS = ['Living Room', 'Kitchen', 'Bedroom', 'Bathroom', 'Studio', 'Household'];
var PRIOS = ['Must-have', 'Important', 'Nice-to-have'];
var STATUSES = ['To choose', 'Chosen', 'Ordered', 'Bought', 'Already have', 'Not needed'];
var HEAD = ['id', 'room', 'name', 'priority', 'qty', 'est_each', 'paid', 'status', 'who', 'store', 'links', 'notes', 'order', 'updated', 'image', 'photo'];
var DEFAULT_MODEL = 'gemini-3.5-flash-lite';
// Prices are stored in Korean won. Other currencies are for display, converted with Google Finance rates
// kept in the Settings tab (rate_XXX = how much 1 KRW is worth in XXX).
var CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'CNY', 'CHF'];

// [room, name, priority, qty, estimated price each (KRW, rough guess), note]
var SEED = [
  ["Living Room", "Sofa", "Must-have", 1, 900000, ""],
  ["Living Room", "Coffee table", "Important", 1, 120000, ""],
  ["Living Room", "TV stand", "Important", 1, 180000, ""],
  ["Living Room", "TV", "Nice-to-have", 1, 680000, ""],
  ["Living Room", "Bookshelf", "Important", 1, 140000, ""],
  ["Living Room", "Floor lamp", "Important", 1, 75000, ""],
  ["Living Room", "Rug", "Nice-to-have", 1, 150000, ""],
  ["Living Room", "Curtains", "Important", 2, 45000, "Measure the windows first"],
  ["Living Room", "Cushions and throw blanket", "Nice-to-have", 1, 60000, ""],
  ["Living Room", "Dining table", "Must-have", 1, 300000, ""],
  ["Living Room", "Dining chairs", "Must-have", 4, 60000, ""],
  ["Living Room", "Coat rack (entrance)", "Important", 1, 45000, ""],
  ["Living Room", "Shoe cabinet (entrance)", "Important", 1, 90000, ""],
  ["Living Room", "Doormat", "Must-have", 1, 22000, ""],
  ["Living Room", "Key holder / catch-all tray", "Nice-to-have", 1, 22000, ""],
  ["Living Room", "Plants", "Nice-to-have", 3, 22000, ""],
  ["Kitchen", "Cookware set (pots)", "Must-have", 1, 140000, ""],
  ["Kitchen", "Non-stick frying pans", "Must-have", 2, 38000, ""],
  ["Kitchen", "Knife set + cutting board", "Must-have", 1, 68000, ""],
  ["Kitchen", "Cutlery set", "Must-have", 1, 45000, ""],
  ["Kitchen", "Dinnerware set (plates)", "Must-have", 1, 75000, ""],
  ["Kitchen", "Glasses", "Must-have", 12, 3000, ""],
  ["Kitchen", "Mugs and espresso cups", "Must-have", 1, 30000, ""],
  ["Kitchen", "Cooking utensils (ladles, spatulas, tongs)", "Must-have", 1, 38000, ""],
  ["Kitchen", "Colander, grater, can opener, corkscrew", "Must-have", 1, 38000, ""],
  ["Kitchen", "Baking trays", "Important", 2, 22000, ""],
  ["Kitchen", "Food storage containers", "Important", 1, 38000, ""],
  ["Kitchen", "Oven mitts and tea towels", "Must-have", 1, 22000, ""],
  ["Kitchen", "Recycling bins", "Must-have", 1, 75000, ""],
  ["Kitchen", "Dish rack", "Important", 1, 30000, ""],
  ["Kitchen", "Moka pot / coffee machine", "Must-have", 1, 90000, ""],
  ["Kitchen", "Kettle", "Important", 1, 45000, ""],
  ["Kitchen", "Toaster", "Nice-to-have", 1, 45000, ""],
  ["Kitchen", "Microwave", "Important", 1, 140000, ""],
  ["Kitchen", "Blender / hand blender", "Nice-to-have", 1, 60000, ""],
  ["Kitchen", "Fridge", "Must-have", 1, 750000, "Set to 'Already have' if it's already there"],
  ["Kitchen", "Oven", "Must-have", 1, 450000, "Set to 'Already have' if it's already there"],
  ["Kitchen", "Hob / stovetop", "Must-have", 1, 380000, "Set to 'Already have' if it's already there"],
  ["Kitchen", "Dishwasher", "Important", 1, 600000, "Set to 'Already have' if it's already there"],
  ["Bedroom", "Bed frame + slats", "Must-have", 1, 450000, ""],
  ["Bedroom", "Mattress", "Must-have", 1, 600000, "Try it in store if possible"],
  ["Bedroom", "Pillows", "Must-have", 2, 38000, ""],
  ["Bedroom", "Mattress protector", "Must-have", 1, 45000, ""],
  ["Bedroom", "Bed sheet sets", "Must-have", 2, 52000, ""],
  ["Bedroom", "Duvet", "Must-have", 1, 100000, ""],
  ["Bedroom", "Duvet covers", "Important", 2, 52000, ""],
  ["Bedroom", "Bedside tables", "Important", 2, 60000, ""],
  ["Bedroom", "Bedside lamps", "Important", 2, 30000, ""],
  ["Bedroom", "Wardrobe", "Must-have", 1, 520000, "Measure the space"],
  ["Bedroom", "Chest of drawers", "Important", 1, 180000, ""],
  ["Bedroom", "Clothes hangers", "Must-have", 40, 1000, ""],
  ["Bedroom", "Full-length mirror", "Nice-to-have", 1, 90000, ""],
  ["Bedroom", "Blackout curtains", "Important", 1, 60000, ""],
  ["Bathroom", "Towel sets", "Must-have", 2, 45000, ""],
  ["Bathroom", "Bathrobes", "Important", 2, 38000, ""],
  ["Bathroom", "Bath mat", "Must-have", 1, 18000, ""],
  ["Bathroom", "Shower curtain (if no glass door)", "Important", 1, 22000, ""],
  ["Bathroom", "Bathroom cabinet / organizer", "Important", 1, 75000, ""],
  ["Bathroom", "Soap dispenser + toothbrush holder", "Must-have", 1, 22000, ""],
  ["Bathroom", "Toilet brush", "Must-have", 1, 15000, ""],
  ["Bathroom", "Waste bin", "Must-have", 1, 15000, ""],
  ["Bathroom", "Laundry basket", "Must-have", 1, 30000, ""],
  ["Bathroom", "Hair dryer", "Important", 1, 45000, ""],
  ["Bathroom", "Bathroom scale", "Nice-to-have", 1, 30000, ""],
  ["Bathroom", "Washing machine", "Must-have", 1, 600000, "Set to 'Already have' if it's already there"],
  ["Bathroom", "Tumble dryer", "Nice-to-have", 1, 600000, ""],
  ["Bathroom", "Drying rack", "Must-have", 1, 52000, ""],
  ["Bathroom", "Iron", "Important", 1, 60000, ""],
  ["Bathroom", "Ironing board", "Important", 1, 52000, ""],
  ["Studio", "Desk", "Must-have", 1, 150000, ""],
  ["Studio", "Office chair", "Must-have", 1, 120000, ""],
  ["Studio", "Desk lamp", "Important", 1, 38000, ""],
  ["Studio", "Shelf / storage for documents", "Important", 1, 75000, ""],
  ["Studio", "Power strip with surge protection", "Must-have", 1, 30000, ""],
  ["Studio", "Desk organizer", "Nice-to-have", 1, 22000, ""],
  ["Studio", "Monitor", "Nice-to-have", 1, 220000, ""],
  ["Household", "Vacuum cleaner", "Must-have", 1, 220000, ""],
  ["Household", "Broom and dustpan", "Must-have", 1, 22000, ""],
  ["Household", "Mop and bucket", "Must-have", 1, 38000, ""],
  ["Household", "Cleaning products kit (floors, bathroom, dishes, laundry)", "Must-have", 1, 60000, ""],
  ["Household", "Sponges and microfiber cloths", "Must-have", 1, 15000, ""],
  ["Household", "Basic toolbox", "Must-have", 1, 52000, ""],
  ["Household", "Drill", "Important", 1, 90000, ""],
  ["Household", "Screws, wall plugs and hooks", "Must-have", 1, 22000, ""],
  ["Household", "LED light bulbs", "Must-have", 10, 4500, ""],
  ["Household", "Extension cords and power strips", "Must-have", 3, 18000, ""],
  ["Household", "First aid kit", "Must-have", 1, 30000, ""],
  ["Household", "Flashlight + batteries", "Must-have", 1, 22000, ""],
  ["Household", "Smoke / gas detector", "Important", 1, 45000, ""],
  ["Household", "Step stool / small ladder", "Important", 1, 52000, ""]
];

/* ---------------- menu & web app ---------------- */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🏠 House Wishlist')
    .addItem('1. Set up the list', 'setup')
    .addItem('2. Set Gemini API key', 'setApiKey')
    .addItem('Remove guessed prices', 'clearGuessedPrices')
    .addItem('Test Gemini', 'testGemini')
    .addToUi();
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('House Wishlist')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// The sheet this script is attached to. Every copy of the template uses its own sheet.
function ss_() {
  var s = SpreadsheetApp.getActiveSpreadsheet();
  if (s) return s;
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  throw new Error('NO_SHEET');
}

/* ---------------- one-time setup ---------------- */

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());

  var items = ss.getSheetByName('Items');
  if (items && items.getLastRow() > 1) {
    var r = ui.alert('The "Items" tab already has data.', 'Keep it? (Yes = keep your items, No = replace with the starter list)', ui.ButtonSet.YES_NO);
    if (r !== ui.Button.YES) { items.clear(); fillSeed_(items); }
  } else {
    if (!items) items = ss.insertSheet('Items');
    items.clear();
    fillSeed_(items);
  }

  var st = ss.getSheetByName('Settings') || ss.insertSheet('Settings');
  if (st.getLastRow() < 1) {
    st.getRange(1, 1, 5, 2).setValues([['key', 'value'], ['budget', ''], ['nameA', ''], ['nameB', ''], ['gemini_model', DEFAULT_MODEL]]);
    st.getRange('A1:B1').setFontWeight('bold');
    st.setColumnWidth(1, 140); st.setColumnWidth(2, 220);
  }

  buildSummary_(ss);
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Foglio1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
  ss.setActiveSheet(ss.getSheetByName('Summary'));
  ui.alert('Fatto! Ora: 🏠 House Wishlist → 2. Set Gemini API key, poi pubblica l\'app (vedi la guida).');
}

function fillSeed_(sh) {
  sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground('#1F3A5F').setFontColor('#FFFFFF');
  var now = new Date();
  var rows = SEED.map(function (s, i) {
    return [newId_(), s[0], s[1], s[2], s[3], '', '', 'To choose', '', '', '', s[5], i, now, '', '=IF(INDIRECT("O"&ROW())="","",IMAGE(INDIRECT("O"&ROW())))'];
  });
  sh.getRange(2, 1, rows.length, HEAD.length).setValues(rows);
  sh.setFrozenRows(1);
  sh.getRange('E:G').setNumberFormat('#,##0');
  sh.getRange('K:L').setWrap(true);
  var widths = [80, 110, 260, 100, 45, 75, 75, 100, 60, 110, 320, 220, 50, 140, 160, 90];
  widths.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  var dv = function (list) { return SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(false).build(); };
  sh.getRange('B2:B').setDataValidation(dv(ROOMS));
  sh.getRange('D2:D').setDataValidation(dv(PRIOS));
  sh.getRange('H2:H').setDataValidation(dv(STATUSES));
}

function buildSummary_(ss) {
  var sh = ss.getSheetByName('Summary') || ss.insertSheet('Summary', 0);
  sh.clear();
  sh.getRange('A1').setValue('House Wishlist – budget summary').setFontSize(16).setFontWeight('bold');
  sh.getRange('A3:F3').setValues([['Room', 'Items', 'Bought', 'Est. total (₩)', 'Paid (₩)', 'Still to spend (₩)']]).setFontWeight('bold').setBackground('#1F3A5F').setFontColor('#FFFFFF');
  var live = '(Items!$H$2:$H<>"Already have")*(Items!$H$2:$H<>"Not needed")';
  ROOMS.forEach(function (r, i) {
    var row = 4 + i, rm = '(Items!$B$2:$B=$A' + row + ')';
    sh.getRange(row, 1, 1, 6).setFormulas([[
      '="' + r + '"',
      '=SUMPRODUCT(' + rm + '*' + live + ')',
      '=COUNTIFS(Items!$B$2:$B,$A' + row + ',Items!$H$2:$H,"Bought")',
      '=SUMPRODUCT(' + rm + '*' + live + '*Items!$E$2:$E*Items!$F$2:$F)',
      '=SUMIFS(Items!$G$2:$G,Items!$B$2:$B,$A' + row + ')',
      '=SUMPRODUCT(' + rm + '*' + live + '*(Items!$H$2:$H<>"Bought")*Items!$E$2:$E*Items!$F$2:$F)'
    ]]);
  });
  var t = 4 + ROOMS.length;
  sh.getRange(t, 1, 1, 6).setFormulas([['="Total"', '=SUM(B4:B' + (t - 1) + ')', '=SUM(C4:C' + (t - 1) + ')', '=SUM(D4:D' + (t - 1) + ')', '=SUM(E4:E' + (t - 1) + ')', '=SUM(F4:F' + (t - 1) + ')']]).setFontWeight('bold');
  sh.getRange(t + 2, 1, 3, 2).setFormulas([
    ['="Budget"', '=IFERROR(VLOOKUP("budget",Settings!A:B,2,FALSE),"")'],
    ['="Budget left"', '=IF(B' + (t + 2) + '="","",B' + (t + 2) + '-E' + t + '-F' + t + ')'],
    ['="Estimated prices are rough guesses; the app updates them when you add links."', '']
  ]);
  sh.getRange('D4:F' + (t + 3)).setNumberFormat('₩#,##0');
  sh.getRange('B' + (t + 2) + ':B' + (t + 3)).setNumberFormat('₩#,##0');
  sh.setColumnWidth(1, 160);
}

// Clears the starter estimates on items nobody has picked yet (no link, still "To choose", nothing paid).
// Undo with File → Version history if needed.
function clearGuessedPrices() {
  var sh = itemsSheet_();
  var vals = sh.getDataRange().getValues();
  var col = {}; vals[0].forEach(function (h, i) { col[h] = i; });
  var n = 0;
  for (var r = 1; r < vals.length; r++) {
    var row = vals[r];
    if (!row[col.id]) continue;
    var noLink = String(row[col.links] || '').trim() === '';
    if (noLink && String(row[col.status]) === 'To choose' && row[col.paid] === '' && row[col.est_each] !== '') {
      sh.getRange(r + 1, col.est_each + 1).setValue('');
      n++;
    }
  }
  try { SpreadsheetApp.getUi().alert('Removed ' + n + ' guessed prices.'); } catch (e) {}
  return n;
}

function setApiKey() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Gemini API key', 'Paste the key from aistudio.google.com/apikey. It is stored in the script settings, not in the sheet.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var k = r.getResponseText().trim();
  if (!k) return;
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', k);
  ui.alert('Saved. Use 🏠 House Wishlist → Test Gemini to check it.');
}

function testGemini() {
  var ui = SpreadsheetApp.getUi();
  try {
    var out = gemini_('Reply with only this JSON: {"ok": true}');
    ui.alert('Gemini works (' + model_() + '): ' + JSON.stringify(out));
  } catch (e) {
    ui.alert('Gemini error: ' + e.message);
  }
}

/* ---------------- data API (called from the page) ---------------- */

// Returns the Items sheet, adding the photo columns to lists created before photos existed.
function itemsSheet_() {
  var sh = ss_().getSheetByName("Items");
  if (!sh) throw new Error('NOT_SET_UP');
  var c = HEAD.indexOf('image') + 1;
  if (sh.getRange(1, c).getValue() !== 'image') {
    sh.getRange(1, c, 1, 2).setValues([['image', 'photo']]).setFontWeight('bold').setBackground('#1F3A5F').setFontColor('#FFFFFF');
    sh.setColumnWidth(c, 160); sh.setColumnWidth(c + 1, 90);
  }
  return sh;
}

function getData() {
  var ss = ss_();
  var sh = itemsSheet_();
  var vals = sh.getDataRange().getValues();
  var head = vals.shift();
  var col = {}; head.forEach(function (h, i) { col[h] = i; });
  var items = vals.filter(function (r) { return r[col.id] !== ''; }).map(function (r) { return rowToItem_(r, col); });
  var appUrl = ''; try { appUrl = ScriptApp.getService().getUrl() || ''; } catch (e) {}
  ensureRates_(ss);
  return { items: items, settings: getSettings_(ss), sheetUrl: ss.getUrl(), appUrl: appUrl };
}

function addItem(item) {
  return withLock_(function () {
    var sh = itemsSheet_();
    var it = cleanItem_(item);
    it.id = it.id || newId_();
    sh.appendRow(itemToRow_(it));
    return it.id;
  });
}

function patchItem(id, patch) {
  return withLock_(function () {
    var sh = itemsSheet_();
    var r = findRow_(sh, id);
    if (!r) throw new Error('NOT_FOUND');
    var vals = sh.getRange(r, 1, 1, HEAD.length).getValues()[0];
    var col = {}; HEAD.forEach(function (h, i) { col[h] = i; });
    var it = rowToItem_(vals, col);
    Object.keys(patch || {}).forEach(function (k) { it[k] = patch[k]; });
    sh.getRange(r, 1, 1, HEAD.length).setValues([itemToRow_(cleanItem_(it))]);
    return true;
  });
}

function deleteItem(id) {
  return withLock_(function () {
    var sh = itemsSheet_();
    var r = findRow_(sh, id);
    if (r) sh.deleteRow(r);
    return true;
  });
}

function saveSettings(patch) {
  return withLock_(function () {
    var sh = ss_().getSheetByName('Settings');
    var vals = sh.getDataRange().getValues();
    Object.keys(patch || {}).forEach(function (k) {
      if (['budget', 'nameA', 'nameB', 'currency'].indexOf(k) < 0) return;
      if (k === 'currency' && ['KRW'].concat(CURRENCIES).indexOf(patch[k]) < 0) return;
      var found = false;
      for (var i = 1; i < vals.length; i++) if (vals[i][0] === k) { sh.getRange(i + 1, 2).setValue(patch[k] == null ? '' : patch[k]); found = true; }
      if (!found) sh.appendRow([k, patch[k] == null ? '' : patch[k]]);
    });
    return true;
  });
}

/* ---------------- endpoint for the "+ Casa" Chrome extension ---------------- */
// The extension POSTs JSON: {action: "prepare", url, notes} or {action: "save", ...}. It runs as the signed-in user.

function doPost(e) {
  var out;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (req.action === 'prepare') out = { ok: true, data: prepareForExtension_(String(req.url || ''), String(req.notes || '')) };
    else if (req.action === 'save') out = { ok: true, data: saveFromExtension_(req) };
    else if (req.action === 'ping') out = { ok: true, data: { items: getData().items.length } };
    else out = { ok: false, error: 'BAD_ACTION' };
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function prepareForExtension_(url, notes) {
  var analysis = analyzeLink(url, notes);
  var items = getData().items.map(function (it) {
    return { id: it.id, room: it.room, name: it.name, links: (it.links || []).length };
  });
  var st = getSettings_(ss_());
  return { analysis: analysis, items: items, settings: { currency: st.currency || 'EUR', rate: rateOf_(st, st.currency || 'EUR') } };
}

function saveFromExtension_(p) {
  if (!/^https?:/i.test(String(p.url || ''))) throw new Error('BAD_URL');
  return withLock_(function () {
    var sh = itemsSheet_();
    var price = num_(p.price);
    var name = String(p.name || '').trim() || 'New item';
    var col = {}; HEAD.forEach(function (h, i) { col[h] = i; });
    if (p.matchId) {
      var r = findRow_(sh, p.matchId);
      if (r) {
        var it = rowToItem_(sh.getRange(r, 1, 1, HEAD.length).getValues()[0], col);
        it.links.push({ url: String(p.url), label: name, image: String(p.image || '') });
        if (!it.image && p.image) it.image = String(p.image);
        if (price != null) it.est = price;
        if (!it.store && p.store) it.store = String(p.store);
        if (it.status === 'To choose') it.status = 'Chosen';
        if (p.summary && !it.notes) it.notes = String(p.summary);
        sh.getRange(r, 1, 1, HEAD.length).setValues([itemToRow_(cleanItem_(it))]);
        return { attached: true, name: it.name, room: it.room };
      }
    }
    var item = cleanItem_({
      room: p.room, name: name, priority: p.priority, qty: p.qty, est: price, status: 'Chosen',
      store: p.store, notes: p.summary, links: [{ url: String(p.url), label: String(p.store || ''), image: String(p.image || '') }], image: String(p.image || ''), order: Date.now()
    });
    item.id = newId_();
    sh.appendRow(itemToRow_(item));
    return { added: true, name: item.name, room: item.room };
  });
}

/* ---------------- link analysis with Gemini ---------------- */

function analyzeLink(url, extra) {
  if (!/^https?:\/\//i.test(url)) throw new Error('BAD_URL');
  var pg = fetchPage_(url), page = pg.text;
  var data = getData();
  var rates = CURRENCIES.map(function (c) { var r = rateOf_(data.settings, c); return r ? '1 ' + c + ' = ' + Math.round(1 / r) + ' KRW' : ''; }).filter(String).join(', ');
  var list = data.items.map(function (it) { return it.id + ' | ' + it.room + ' | ' + it.name; }).join('\n');
  var prompt = [
    "You are filing a product into a couple's shopping list for furnishing their new home. Prices are recorded in Korean won (KRW).",
    'Rooms (pick exactly one): ' + ROOMS.join(', ') + '. "Household" is for cleaning, tools and general utilities. Washing machine, dryer and laundry go in Bathroom. Entrance items go in Living Room.',
    'Priorities (pick one): "Must-have" (needed to live there from day one), "Important", "Nice-to-have".',
    'Existing list items, one per line as "id | room | name":',
    list,
    '',
    'Product link: ' + url,
    'Text from the product page (may be empty, partial or cookie-banner noise):',
    '"""' + (page || '(not available)') + '"""',
    'Notes typed by the user, or text the user\'s browser copied from the product page (may be empty, may be Korean or machine-translated; if several prices appear, use the current selling price after discount, not the crossed-out original price and not a coupon-only price): """' + (extra || '') + '"""',
    '',
    page ? 'Work out what the product is from the page text, the notes and the words in the link.'
         : 'The shop blocks direct reading, so the page text is missing. Use the URL context tool to open the link and Google Search to look the product up (search the full link, and the shop name together with the product number in the link) to find its real name and current price. If you still cannot find it, use the notes and the words in the link, and set price to null rather than guessing.',
    'Reply with only one JSON object:',
    '{"name": "short English name, max 60 chars, in English even if the page is Korean, keep brand/model e.g. \'KIVIK 3-seat sofa, grey\'", "room": "...", "priority": "...", "price": number in Korean won (KRW) for ONE unit, no decimals (if the page uses another currency convert it with the current rates: ' + (rates || 'approximate rates') + '; 89만원 = 890000), or null if not stated, "qty": integer (1 unless a set count clearly matters), "store": "shop name", "match_id": "id of the existing item this product would fulfil (e.g. a sofa link matches the Sofa item), or null", "summary": "one short line with useful specs like size, colour, material, or empty"}'
  ].join('\n');
  var r = gemini_(prompt, { web: !page && !extra });
  r.pageRead = page ? 'page' : (r._web ? 'web' : '');
  delete r._web;
  // Nothing to go on (page blocked, no web lookup, no notes, no words in the link): don't let Gemini guess.
  var linkWords = decodeURIComponent(url.replace(/^https?:..[^\/]+/, '')).replace(/[^A-Za-z가-힣]+/g, ' ').trim();
  var noisy = /^(goods|p|product|products|productions|selling|item|items|dp|vp|kr|ko)( (goods|p|product|products|productions|selling|item|items|dp|vp|kr|ko))*$/i;
  if (!r.pageRead && !extra && (!linkWords || noisy.test(linkWords))) {
    return { unknown: true, store: r.store || '', pageRead: '', image: pg.image };
  }
  r.image = pg.image;
  return r;
}

function fetchPage_(url) {
  try {
    var res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true, followRedirects: true, validateHttpsCertificates: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' }
    });
    if (res.getResponseCode() >= 400) return { text: '', image: '' };
    var html = res.getContentText();
    if (html.length < 1500 || /<title[^>]*>\s*(Access Denied|Just a moment|Attention Required)/i.test(html)) return { text: '', image: '' };
    var bits = [], image = '';
    var t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i); if (t) bits.push('TITLE: ' + t[1]);
    var metaRe = /<meta[^>]+(?:property|name|itemprop)=["']([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi, m;
    while ((m = metaRe.exec(html)) !== null) {
      if (/^(og:title|og:description|og:price|product:price|price|og:site_name|description|twitter:title)/i.test(m[1])) bits.push(m[1] + ': ' + m[2]);
      if (!image && /^(og:image|twitter:image)$/i.test(m[1]) && /^https?:/i.test(m[2])) image = m[2].replace(/&amp;/g, '&');
    }
    var ldRe = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
    while ((m = ldRe.exec(html)) !== null) { if (/Product|Offer|price/i.test(m[1])) bits.push('JSON-LD: ' + m[1].replace(/\s+/g, ' ').slice(0, 2500)); }
    var body = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&euro;/g, '€').replace(/\s+/g, ' ');
    bits.push('PAGE: ' + body.slice(0, 5000));
    return { text: bits.join('\n').slice(0, 9000), image: image };
  } catch (e) {
    return { text: '', image: '' };
  }
}

function model_() {
  try {
    var v = getSettings_(ss_()).gemini_model;
    return v ? String(v).trim() : DEFAULT_MODEL;
  } catch (e) { return DEFAULT_MODEL; }
}

function gemini_(prompt, opts) {
  opts = opts || {};
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('NO_KEY');
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model_()) + ':generateContent';
  // With web lookup: try URL context + Google Search, then URL context alone (Search is not in every plan), then no tools.
  var attempts = opts.web ? [[{ url_context: {} }, { google_search: {} }], [{ url_context: {} }], null] : [null];
  var res, code, used = null;
  for (var a = 0; a < attempts.length; a++) {
    var body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1 } };
    if (attempts[a]) body.tools = attempts[a];
    else body.generationConfig.responseMimeType = 'application/json';
    res = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'x-goog-api-key': key },
      payload: JSON.stringify(body)
    });
    code = res.getResponseCode();
    if (code === 200) { used = attempts[a]; break; }
    console.log('Gemini ' + code + ' with tools ' + JSON.stringify(attempts[a]) + ': ' + res.getContentText().slice(0, 400));
    if ([400, 403, 429].indexOf(code) < 0) break;
  }
  if (code === 429) throw new Error('GEMINI_LIMIT');
  if (code !== 200) throw new Error('GEMINI_' + code + ': ' + res.getContentText().slice(0, 300));
  var j = JSON.parse(res.getContentText());
  var parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
  var text = parts.map(function (p) { return p.text || ''; }).join('');
  var s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s < 0 || e < s) throw new Error('GEMINI_EMPTY');
  var out = JSON.parse(text.slice(s, e + 1));
  if (used) {
    // Count the web lookup only if a page was really opened or a search returned results.
    var c0 = j.candidates[0] || {};
    var urls = (c0.urlContextMetadata && c0.urlContextMetadata.urlMetadata) || [];
    var urlOk = urls.some(function (u) { return /SUCCESS/.test(String(u.urlRetrievalStatus || '')); });
    var searchOk = !!(c0.groundingMetadata && c0.groundingMetadata.groundingChunks && c0.groundingMetadata.groundingChunks.length);
    if (urlOk || searchOk) out._web = true;
  }
  return out;
}

/* ---------------- helpers ---------------- */

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function newId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 10); }

function findRow_(sh, id) {
  var ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

function num_(v) {
  if (v === '' || v == null) return null;
  var n = Number(v);
  return isFinite(n) ? n : null;
}

// One link per line: "label | url | image" (label and image optional).
function parseLinks_(s) {
  return String(s || '').split('\n').map(function (l) { return l.trim(); }).filter(String).map(function (l) {
    var parts = l.split(/\s*\|\s*/), label = [], url = '', image = '';
    parts.forEach(function (p) {
      if (/^https?:/i.test(p)) { if (!url) url = p; else if (!image) image = p; }
      else if (!url && p) label.push(p);
    });
    return { label: label.join(' / '), url: url || l, image: image };
  });
}

function rowToItem_(r, col) {
  return {
    id: String(r[col.id]), room: String(r[col.room] || ''), name: String(r[col.name] || ''),
    priority: String(r[col.priority] || 'Important'), qty: num_(r[col.qty]) || 1,
    est: num_(r[col.est_each]), paid: num_(r[col.paid]), status: String(r[col.status] || 'To choose'),
    who: String(r[col.who] || ''), store: String(r[col.store] || ''), links: parseLinks_(r[col.links]),
    notes: String(r[col.notes] || ''), order: num_(r[col.order]) || 0,
    image: col.image != null ? String(r[col.image] || '') : ''
  };
}

function cleanItem_(it) {
  return {
    id: it.id ? String(it.id).slice(0, 40) : '',
    room: ROOMS.indexOf(it.room) > -1 ? it.room : 'Household',
    name: String(it.name || 'New item').slice(0, 120),
    priority: PRIOS.indexOf(it.priority) > -1 ? it.priority : 'Important',
    qty: Math.max(0, Math.round(num_(it.qty) == null ? 1 : num_(it.qty))),
    est: num_(it.est), paid: num_(it.paid),
    status: STATUSES.indexOf(it.status) > -1 ? it.status : 'To choose',
    who: ['A', 'B', 'Both'].indexOf(it.who) > -1 ? it.who : '',
    store: String(it.store || '').slice(0, 80),
    links: (it.links || []).filter(function (l) { return l && /^https?:\/\//i.test(l.url); }).slice(0, 20).map(function (l) {
      return { url: String(l.url), label: String(l.label || ''), image: /^https?:/i.test(l.image || '') ? String(l.image).slice(0, 1000) : '' };
    }),
    image: /^https?:/i.test(it.image || '') ? String(it.image).slice(0, 1000) : '',
    notes: String(it.notes || '').slice(0, 1000),
    order: num_(it.order) || 0
  };
}

function itemToRow_(it) {
  var links = it.links.map(function (l) { return [l.label ? l.label.replace(/\|/g, '/') : '', l.url, l.image || ''].filter(String).join(' | '); }).join('\n');
  var image = it.image || (it.links.filter(function (l) { return l.image; })[0] || {}).image || '';
  return [it.id, it.room, it.name, it.priority, it.qty, it.est == null ? '' : it.est, it.paid == null ? '' : it.paid,
    it.status, it.who, it.store, links, it.notes, it.order, new Date(), image, '=IF(INDIRECT("O"&ROW())="","",IMAGE(INDIRECT("O"&ROW())))'];
}

// Adds the display-currency row and one live Google Finance rate per currency to the Settings tab (once).
function ensureRates_(ss) {
  var sh = ss.getSheetByName('Settings');
  if (!sh) return;
  var keys = sh.getDataRange().getValues().map(function (r) { return r[0]; });
  if (keys.indexOf('currency') < 0) sh.appendRow(['currency', 'EUR']);
  CURRENCIES.forEach(function (c) {
    if (keys.indexOf('rate_' + c) < 0) sh.appendRow(['rate_' + c, '=GOOGLEFINANCE("CURRENCY:KRW' + c + '")']);
  });
}

function rateOf_(st, cur) {
  if (!cur || cur === 'KRW') return 1;
  var r = Number(st['rate_' + cur]);
  return isFinite(r) && r > 0 ? r : null;
}

function getSettings_(ss) {
  var sh = ss.getSheetByName('Settings');
  var out = {};
  if (!sh) return out;
  sh.getDataRange().getValues().slice(1).forEach(function (r) { if (r[0]) out[r[0]] = r[1]; });
  return out;
}
