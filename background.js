var searchEngines = {};
var searchEnginesArray = [];
var selection = "";
var targetUrl = "";
var browserVersion = 0;
var openTabInForeground = true;

function onError(error) {
    console.log(`Error: ${error}`)
}

function gotBrowserInfo(info){
    let v = info.version;
    browserVersion = parseInt(v.slice(0, v.search(".") - 1));
}

function buildContextMenu(searchEngine, strId, strTitle, faviconUrl){
    browser.contextMenus.create({
        id: "cs-google-site",
        title: "Search this site with Google",
        contexts: ["selection"]
    });
    browser.contextMenus.create({
        id: "cs-options",
        title: "Options...",
        contexts: ["selection"]
    });
    browser.contextMenus.create({
        id: "cs-separator",
        type: "separator",
        contexts: ["selection"]
      });
    if (searchEngine.show) {
        if (browserVersion > 55){
            browser.contextMenus.create({
                id: strId,
                title: strTitle,
                contexts: ["selection"],
                icons: {
                    18: faviconUrl
                }
            });
        } else {
            browser.contextMenus.create({
                id: strId,
                title: strTitle,
                contexts: ["selection"]
            });
        }
    }
}

function onHas(bln) {
    if (bln.tabActive === true || bln.tabActive === false) openTabInForeground = bln.tabActive
}

function onNone() {
    openTabInForeground = true;
    browser.storage.local.set({"tabActive": true});
}

function init() {
    browser.storage.local.get("tabActive").then(onHas, onNone);
    onStorageSyncChanges();
}

function onStorageChanges(changes, area) {
    if (area === "local") {
        const changedItems = Object.keys(changes);
        const index = changedItems.indexOf("tabActive");
        if (index >= 0) {
            openTabInForeground = changes["tabActive"].newValue
        }
    } else {
        onStorageSyncChanges();
    }
}

function sortByIndex(list) {
    var sortedList = {};
    for (var i = 0;i < Object.keys(list).length;i++) {
      for (let se in list) {
        if (list[se].index === i) {
          sortedList[se] = list[se];
        }
      }
    }
    return sortedList;
  }

// Create the context menu using the search engines from storage sync
function onStorageSyncChanges() {
    browser.contextMenus.removeAll();
    browser.storage.sync.get(null).then(
        (data) => {
            searchEngines = sortByIndex(data);
            searchEnginesArray = [];
            var index = 0;
            for (var se in searchEngines) {
                var strId = "cs-" + index.toString();
                var strTitle = searchEngines[se].name;
                var url = searchEngines[se].url;
                var faviconUrl = "https://s2.googleusercontent.com/s2/favicons?domain_url=" + url;
                searchEnginesArray.push(se);
                buildContextMenu(searchEngines[se], strId, strTitle, faviconUrl);
                index += 1;
            }
        }
    );
}

// Perform search based on selected search engine, i.e. selected context menu item
function processSearch(info, tab){
    var tabPosition = tab.index + 1;
    let id = info.menuItemId.replace("cs-", "");

    // Prefer info.selectionText over selection received by content script for these lengths (more reliable)
    if (info.selectionText.length < 150 || info.selectionText.length > 150) {
        selection = info.selectionText;
    }

    if (id === "google-site" && targetUrl != "") {
        openTab(targetUrl, tabPosition);
        targetUrl = "";
        return
    } else if (id === "options") {
        browser.runtime.openOptionsPage().then(null, onError);
        return
    }

    id = parseInt(id);
    
    // At this point, it should be a number
    if(!isNaN(id)){
        targetUrl = searchEngines[searchEnginesArray[id]].url + encodeURIComponent(selection);
        openTab(targetUrl, tabPosition);
        targetUrl = "";
    }    
}

function openTab(targetUrl, tabPosition) {
    browser.tabs.create({
        active: openTabInForeground,
        index: tabPosition,
        url: targetUrl
    });
}

function getMessage(message) {
    if (message.selection) selection = message.selection;
    if (message.targetUrl) targetUrl = message.targetUrl
}

browser.runtime.getBrowserInfo().then(gotBrowserInfo);
browser.storage.onChanged.addListener(onStorageChanges);
browser.contextMenus.onClicked.addListener(processSearch);
browser.runtime.onMessage.addListener(getMessage);
init();
