//段子数据
const jokes = [
    "程序员最害怕的两个字是——“重构”",
    "为什么程序员喜欢黑暗模式？因为灯亮了工资就没了",
    "我老婆让我别买游戏机，我说这是投资——投资我开心",
    "前端和后端分手了，因为后端总说：你样式我不管",
    "程序员谈恋爱就像debug：到处都是bug，还不让说话"
];

// GIF数据
const mediaItems = [
    { type: "gif",   url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDgxNzR1YnB6aWJ3bXB4NmFweHVreW1mNXhzZ2xwOWh6dG04dGxkNiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/nGMnDqebzDcfm/giphy.gif" },
    { type: "gif",   url: "https://media.giphy.com/media/11ZSwQNWba4YF2/giphy.gif" },
    { type: "gif",   url: "https://media.giphy.com/media/xVRRDVP6lqtNQJrzN7/giphy.gif" },
    { type: "gif",   url: "https://media.giphy.com/media/ukMiDlCmdv2og/giphy.gif" },
];

const contentEl = document.getElementById('content');
const btn = document.getElementById('btn-next');

// 显示随机笑话
function showRandomJoke() {
    //文字与gif随机出现的概率
    const isMedia = Math.random() < 0.4;

    if(!isMedia) {
        const idx = Math.floor(Math.random() * jokes.length);
        contentEl.textContent = `<div class="joke"> ${jokes[idx]} </div>`;
    } else {
        const mediaIdx = Math.floor(Math.random() * mediaItems.length);
        const item = mediaItems[mediaIdx];

        if (item.type === "gif" || item.type === "image") {
            const tag = item.type === "gif" ? "img" : "img"; //+++
            contentEl.innerHTML = `
                <img
                    src = "${item.url}",
                    alt = "搞笑图/gif"
                    sytle = "max-width:100%; height:auto; border-radius:8px;"
                >
            `;
        }
    }
}

btn.addEventListener('click', showRandomJoke); //+++为什么这里的showRandomJoke没有括号

showRandomJoke();