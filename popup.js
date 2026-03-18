// 引入数据
import { jokes, mediaItems } from "./data/content.js";

const contentEl = document.getElementById('content');
const btnNext = document.getElementById('btn-next');
const btnFavorite = document.getElementById("btn-favorite");
const btnRandomFav = document.getElementById("btn-random-fav");

// 缓存长度，方便判断是否完全看完
const TOTAL_JOKES = jokes.length;
const TOTAL_MEDIA = mediaItems.length;


let currentItem = null;         // 当前显示的内容（用于收藏时知道要存哪个id）
let isInFavoriteMode = false;   // 是否正在浏览收藏模式


// 辅助函数：从数组中随机取一项
function randomFrom(array) {
    if (array.length === 0) return null;
    const idx = Math.floor(Math.random() * array.length);
    return array[idx];
}

// 获取下一个未看过的内容
async function getNextUnseen() {
    const data = await chrome.storage.local.get(["seenJokes", "seenMedia"]); 
    const seenJokes = new Set(data.seenJokes || []);
    const seenMedia = new Set(data.seenMedia || []); // +++p4

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
    const data = await chrome.storage.local.get(["favoriteJokes", "favoriteMedia"]);
    const favJokes = data.favoriteJokes || [];
    const favMedia = data.favoriteMedia || [];

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
    if (!item || !item.id) return;

    const key = item.id.startsWith("j_") ? "seenJokes" : "seenMedia";
    const data = await chrome.storage.local.get(key);
    const list = data[key] || []; //+++p2

    if(!list.includes(item.id)) {
        list.push(item.id);
        await chrome.storage.local.set({ [key]: list});// +++p3
    }
}

// 收藏当前内容
async function addToFavorite(item) {
    if (!item || !item.id) return;

    const key = item.id.startsWith("j_") ? "favoriteJokes" : "favoriteMedia";
    const data = await chrome.storage.local.get(key);
    const list = data[key] || [];

    if (!list.includes(item.id)) {
        list.push(item.id);
        await chrome.storage.local.set({ [key]: list});
        alert("已收藏！");
    } else {
        alert("已经收藏过了");
    }
}

// 从收藏中删除当前项
async function removeFromFavorite(item) {
    if(!item?.id) return; //+++??

    const key = item.id.startsWith("j_") ? "favoriteJokes" : "favoriteMedia";
    const data = await chrome.storage.local.get(key);
    let list = data[key] || []; //+++为什么这里用let 而不是 const

    list = list.filter(id => id !== item.id);
    await chrome.storage.local.set({ [key]: list});

    alert("已从收藏中删除");

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
    btnFavorite.textContent = "删除";
    btnFavorite.classList.add("delete-mode");
}

// 切换回正常模式
function switchToFavoriteMode() {
    isInFavoriteMode = false;
     btnFavorite.textContent = "收藏";
    btnFavorite.classList.remove("delete-mode");
}

// 主逻辑：显示下一个
async function showNext() {
    const item = await getNextUnseen();
    if (item.type === "all_seen") {
        // 全部看完的交互
        const confirmed = confirm("已看完所有内容，是否重置观看记录？\n（确定 = 重置并继续，取消 = 关闭弹窗）");

        if (confirmed) {
            await chrome.storage.local.remove(["seenJokes", "seenMedia"]);
            // 重置后重新获取并显示
            const newItem = await getNextUnseen();
            if (newItem ) { 
                renderContent(newItem);
                await markAsSeen(newItem);
            } else {
                contentEl.innerHTML = '<div class="joke">内容已重置，请点击“换一个”继续</div>';
            }
        } else {
            // 用户取消
            contentEl.innerHTML = '<div class="joke">已看完所有内容\n点击“换一个”可再次确认重置</div>'
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
        contentEl.innerHTML = '<div class="joke">你还没有收藏任何内容哦~</div>';
        return;
    }
    renderContent(item);
    switchToDeleteMode();          // 进入删除模式
}

// 事件绑定
btnNext.addEventListener('click', showNext); //p1
btnFavorite.addEventListener("click", async () => {
    if (!currentItem) {
         alert("请先加载一条内容");
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

// 首次加载
showNext().catch((err) => {
    console.error("初始化失败", err);
    contentEl.innerHTML = '<div class="joke">加载失败，请刷新插件</div>'
});