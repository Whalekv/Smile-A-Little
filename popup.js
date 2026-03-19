let currentLang = 'zh';         // 当前语言 zh 或 en
let jokes = [];                 // 当前语言的笑话数据
let mediaItems = [];            // 当前语言的媒体数据



const contentEl = document.getElementById('content');
const btnNext = document.getElementById('btn-next');
const btnFavorite = document.getElementById("btn-favorite");
const btnRandomFav = document.getElementById("btn-random-fav");
const btnLangSwitch = document.getElementById('btn-lang-switch');


let currentItem = null;         // 当前显示的内容（用于收藏时知道要存哪个id）
let isInFavoriteMode = false;   // 是否正在浏览收藏模式


const TOTAL_JOKES = 6;

// 辅助函数：从数组中随机取一项
function randomFrom(array) {
    if (array.length === 0) return null;
    const idx = Math.floor(Math.random() * array.length);
    return array[idx];
}

// 动态加载对应语言的数据
async function loadLanguageData(lang) {
    try {
        const module = lang === 'zh'
            ? await import('./data/content-zh.js')
            : await import('./data/content-en.js');

        jokes = module.jokes;
        mediaItems = module.mediaItems;
        currentLang = lang;

        // 保存语言偏好
        await chrome.storage.local.set({ preferredLang: lang });

        console.log(`已切换到 ${lang === 'zh' ? '中文' : 'English'} 数据`);
    } catch (err) {
        console.log('加载语言数据失败：', err);
        alert('加载语言数据失败，请刷新插件');
    }
}

// 获取下一个未看过的内容
async function getNextUnseen() {
    const data = await chrome.storage.local.get(["seenJokes", "seenMedia", "seenJokes_en", "seenMedia_en"]); 

    const seenKeyJ = currentLang === 'zh' ? 'seenJokes' : 'seenJokes_en';
    const seenKeyM = currentLang === 'zh' ? 'seenMedia' : 'seenMedia_en';

    const seenJokes = new Set(data[seenKeyJ] || []);
    const seenMedia = new Set(data[seenKeyM] || []); // +++p4

    // 还没有看的数据的数组
    const unseenJokes = jokes.filter((j) => !seenJokes.has(j.id));
    const unseenMedia = mediaItems.filter((m) => !seenMedia.has(m.id));

    // 全部看完了
    if (unseenJokes.length === 0 && unseenMedia.length === 0) {
        return{ type: "all_seen"};
    }

    // 决定本次想显示哪一类
    const wantJoke = Math.random() < 0.6;

    let selected = null;

    if (wantJoke) {
        if (unseenJokes.length > 0) {
            selected = randomFrom(unseenJokes);
        } else if (unseenMedia.length > 0) {
            // 想要Joke，但Joke没了，降级给media
            selected = randomFrom(unseenMedia);
        }
    } else {
        if (unseenMedia.length > 0) {
            selected = randomFrom(unseenMedia);
        } else if (unseenJokes.length > 0) {
            // 想要media，但mediae没了，降级给joke
            selected = randomFrom(unseenJokes);
        }
    }

    if (!selected) {
        selected = randomFrom(unseenJokes.length > 0 ? unseenJokes : unseenMedia);
    }

    return selected;
}

// 从收藏夹中随机取一条（允许重复）
async function getRandomFavorite() {
    const data = await chrome.storage.local.get(["favoriteJokes", "favoriteMedia", "favoriteJokes_en", "favoriteMedia_en"]);

    const favKeyJ = currentLang === 'zh' ? 'favoriteJokes' : 'favoriteJokes_en';
    const favKeyM = currentLang === 'zh' ? 'favoriteMedia' : 'favoriteMedia_en';


    const favJokes = data[favKeyJ] || [];
    const favMedia = data[favKeyM] || [];

    const allFavorites = [
        ...favJokes.map(id => jokes.find(j => j.id === id)).filter(Boolean), //+++p5
        ...favMedia.map(id => mediaItems.find(m => m.id === id)).filter(Boolean)
    ];

    if (allFavorites.length === 0) {
        return null; // 还没有收藏
    }

    return randomFrom(allFavorites);
}

// 保存已查看的记录
async function markAsSeen (item) {
    if (!item?.id) return;

    const isJoke = item.id.startsWith("j_");
    const seenKey = isJoke
        ? (currentLang === 'zh' ? 'seenJokes' : 'seenJokes_en')
        : (currentLang === 'zh' ? 'seenMedia' : 'seenMedia_en');
    const data = await chrome.storage.local.get(seenKey);
    const list = data[seenKey] || []; //+++p2

    if(!list.includes(item.id)) {
        list.push(item.id);
        await chrome.storage.local.set({ [seenKey]: list});// +++p3
    }
}

// 收藏当前内容
async function addToFavorite(item) {
    if (!item?.id) return;

    const isJoke = item.id.startsWith("j_");
    const favKey = isJoke
        ? (currentLang === 'zh' ? 'favoriteJokes' : 'favoriteJokes_en')
        : (currentLang === 'zh' ? 'favoriteMedia' : 'favoriteMedia_en');

    const data = await chrome.storage.local.get(favKey);
    const list = data[favKey] || [];

    if (!list.includes(item.id)) {
        list.push(item.id); // p7
        await chrome.storage.local.set({ [favKey]: list});
        alert(currentLang === 'zh' ? "已收藏！" : "Favorited !");
    } else {
        alert(currentLang === 'zh' ? "已经收藏过了" : "Already favorited");
    }
}

// 从收藏中删除当前项
async function removeFromFavorite(item) {
    if(!item?.id) return; // p6

    const isJoke = item.id.startsWith("j_");
    const favKey = isJoke
        ? (currentLang === 'zh' ? 'favoriteJokes' : 'favoriteJokes_en')
        : (currentLang === 'zh' ? 'favoriteMedia' : 'favoriteMedia_en');

    const data = await chrome.storage.local.get(favKey);
    let list = data[favKey] || []; // p7

    list = list.filter(id => id !== item.id);
    await chrome.storage.local.set({ [favKey]: list});

    alert(currentLang === 'zh' ? "已从收藏中删除" : "Removed from favorites");

}

// 显示内容到页面
function renderContent(item) {
    contentEl.innerHTML = "";

    if (item.text) {
        // joke
        const div = document.createElement("div");
        div.className = "joke";
        div.textContent = item.text;
        contentEl.appendChild(div);
    } else if (item.url) {
        // media
        const img = document.createElement("img");
        img.src = item.url;
        img.alt = "搞笑图/gif";
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        img.style.borderRadius = "8px";
        contentEl.appendChild(img);
    }

    // 记住当前 item，用于收藏
    currentItem = item;
}



// 切换按钮为删除模式（红色）
function switchToDeleteMode() {
    isInFavoriteMode = true;
    btnFavorite.textContent = currentLang === 'zh' ? "删除" : "Delete";
    btnFavorite.classList.add("delete-mode");
}

// 切换回正常模式
function switchToFavoriteMode() {
    isInFavoriteMode = false;
     btnFavorite.textContent = currentLang === 'zh' ? "收藏" : "Favorite";
    btnFavorite.classList.remove("delete-mode");
}

// 主逻辑：显示下一个
async function showNext() {
    const item = await getNextUnseen();
    if (item.type === "all_seen") {
        // 全部看完的交互
        const msg = currentLang === 'zh'
            ? "已看完所有内容，是否重置观看记录？\n（确定 = 重置并继续，取消 = 关闭弹窗）"
            : "All content has been viewed. Reset viewing history?\n(OK = reset and continue, Cancel = close)";
        const confirmed = confirm(msg);

        if (confirmed) {
            const keys = currentLang === 'zh'
                ? ["seenJokes", "seenMedia"]
                : ["seenJokes_en", "seenMedia_en"]
            await chrome.storage.local.remove(keys);
            // 重置后重新获取并显示
            const newItem = await getNextUnseen();
            if (newItem && newItem.type !== "all_seen" ) { 
                renderContent(newItem);
                await markAsSeen(newItem);
            }
        }
        return;
    }

    // 正常显示
    renderContent(item);
    await markAsSeen(item);
    switchToFavoriteMode();        // 切换回收藏模式
}

// 显示随机收藏
async function showRandomFavorite() {
    const item = await getRandomFavorite();
    if (!item) {
        contentEl.innerHTML = `<div class="joke"> ${
            currentLang === 'zh' ? "你还没有收藏任何内容哦~" : "You have no favorites yet~"
        }</div>`;
        return;
    }
    renderContent(item);
    switchToDeleteMode();          // 进入删除模式
}


// 切换语言
async function switchLanguage() {
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    await loadLanguageData(newLang);

    // 更新按钮文字
    btnLangSwitch.textContent = newLang === 'zh' ? 'GB EN' : 'CN 中文';

    // 切换后立即显示新语言的内容
    switchToFavoriteMode();
    await showNext();
}

// 事件绑定
btnNext.addEventListener('click', showNext); //p1
btnFavorite.addEventListener("click", async () => {
    if (!currentItem) {
         alert( currentLang === 'zh' ? "请先加载一条内容" : "Please load content first");
         return;
    }

    if (isInFavoriteMode) {
        // 删除模式
        await removeFromFavorite(currentItem);
        // 删除后立即显示下一条随即收藏
        await showRandomFavorite();
    } else {
        // 正常模式
        await addToFavorite(currentItem);
    }
});
btnRandomFav.addEventListener("click", showRandomFavorite);
// 新增：语言切换按钮事件
btnLangSwitch.addEventListener('click', switchLanguage);


// 初始话
async function init() {
    // 读取用户上次选择的语言（默认中文）
    const data = await chrome.storage.local.get('preferredLang');
    const saveLang = data.preferredLang || 'zh';

    await loadLanguageData(saveLang);

    // 设置切换语言按钮初始文字
    btnLangSwitch.textContent = saveLang === 'zh' ? 'GB EN' : 'CN 中文';
    
    // 首次显示内容
    await showNext();
}

// 首次加载
init().catch((err) => {
    console.error("初始化失败", err);
    contentEl.innerHTML = '<div class="joke">初始化失败，请刷新插件</div>'
});
