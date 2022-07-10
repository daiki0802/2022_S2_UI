/* パラメータ */
// 画像から切り取る範囲
const SOURCE_WIDTH = 90;
const SOURCE_HEIGHT = 60;
// 移動
const MAX_MOVE = 20;
const MOVE_STEP = 1;
// 拡大
const MAX_SCALE = 8;
const MIN_SCALE = 4;
const SCALE_STEP = 0.1;

/* グローバル変数 */
// 画面制御
let timer_flg = 0;
let timer, timeDisplay, overlay;

// キャンバス関連
let canvas, context, mini_window, mini_canvas, mini_context, pin_list;
let img = new Image();
let mini_img = new Image();
let dots = [];
let base_scale; // canvasに対するimgの拡大率
let pin_icon;

// mini-window関連
let window_origin = {x:0, y:0};
let new_dot = null;
let diff = {x:0, y:0}; // 動いたことによるずれ
let scale = 6; // 拡大率
let move_flg = {up:false, left:false, down:false, right:false};
let zoom_flg = {in:false, out:false};
let is_open = false;


window.onload = () => {
    document.onselectstart = () => false; // 選択を無効化
    timer = new easytimer.Timer();
    timeDisplay = document.getElementById("time-display");
    overlay = document.getElementById("overlay");

    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    mini_window = document.getElementById("mini-window");
    mini_canvas = document.getElementById("mini-canvas");
    mini_context = mini_canvas.getContext("2d");
    
    pin_list = document.getElementById("pin_list");
    pin_icon = document.createElement("span");
    pin_icon.classList.add("material-icons");
    pin_icon.innerHTML = "location_on";

    canvas.addEventListener("click", (e) => toggle_window(e, false));
    canvas.addEventListener("contextmenu", (e) => toggle_window(e, true));

    mini_canvas.addEventListener("click", mini_select_point);
    mini_window.addEventListener("contextmenu", (e) => toggle_window(e, true));

    img.src = "image.jpg";
    img.onload = () => {
        base_scale = img.naturalWidth / canvas.clientWidth;
        draw();
    }
}


/* キー操作の設定 */
document.addEventListener("keydown", (e) => {
    switch(e.key){
        case "Enter":
            control_timer();
            return;
        case "ArrowUp":
        case "w":
            move_flg.up = true;
            return;
        case "ArrowLeft":
        case "a":
            move_flg.left = true;
            return;
        case "ArrowDown":
        case "s":
            move_flg.down = true;
            return;
        case "ArrowRight":
        case "d":
            move_flg.right = true;
            return;
        case "e":
            zoom_flg.out = true;
            return;
        case "q":
            zoom_flg.in = true;
            return;
        case "Escape":
            toggle_window(e, false);
            return;
        case "z":
            if(e.ctrlKey) redo(e);
            return;
        case "p":
            print_img();
            return;
        default: return;
    }
});

document.addEventListener("keyup", (e) => {
    switch(e.key){
        case "ArrowUp":
        case "w":
            move_flg.up = false;
            return;
        case "ArrowLeft":
        case "a":
            move_flg.left = false;
            return;
        case "ArrowDown":
        case "s":
            move_flg.down = false;
            return;
        case "ArrowRight":
        case "d":
            move_flg.right = false;
            return;
        case "q":
            zoom_flg.in = false;
            zoom_flg.out = false;
            return;
        case "e":
            zoom_flg.in = false;
            zoom_flg.out = false;
            return;
        default: return;
    }
});

// キーボード操作で変わったフラグに応じて描画
const watch_keys = () => {
    // move
    if(move_flg.up) diff.y = (diff.y >= MAX_MOVE) ? MAX_MOVE : diff.y + MOVE_STEP;
    if(move_flg.left) diff.x = (diff.x >= MAX_MOVE) ? MAX_MOVE : diff.x + MOVE_STEP;
    if(move_flg.down) diff.y = (diff.y <= -MAX_MOVE) ? -MAX_MOVE : diff.y - MOVE_STEP;
    if(move_flg.right) diff.x = (diff.x <= -MAX_MOVE) ? -MAX_MOVE : diff.x - MOVE_STEP;

    // zoom
    if(zoom_flg.in) scale = (scale >= MAX_SCALE) ? MAX_SCALE : scale + SCALE_STEP;
    if(zoom_flg.out) scale = (scale <= MIN_SCALE) ? MIN_SCALE : scale - SCALE_STEP;

    mini_draw();
}


/* 画面制御関連 */
// タイマー制御
const control_timer = () => {
    if(timer_flg == 0){
        timer_flg = 1;
        overlay.style.display = "none";
        timeDisplay.style.display = "block";

        timer.start();
        timer.addEventListener("secondsUpdated", () => {
            timeDisplay.innerHTML = timer.getTimeValues().toString(["minutes", "seconds"]);
        });
    }else if(timer_flg == 1){
        if(dots.length == 10){
            timer.pause();

            timer_flg = 2;
            overlay.style.display = "block";
            timeDisplay.style.display = "none";
            overlay.innerHTML = "結果: " + timer.getTimeValues().toString(["minutes", "seconds"]);
        }else{
            UIkit.notification({message: "10個の点を選択してください", pos: "top-center", status: "danger"});
            setTimeout(() => {UIkit.notification.closeAll()}, 1500);
        }
    }
}

// 画像を出力
const print_img = () => {
    let a = document.createElement('a');
	a.href = canvas.toDataURL('image/jpeg', 1.0);
	a.download = 'zoomclick.jpg';
	a.click();
}


/* キャンバス制御 */
// canvasの描画
const draw = () => {
    context.scale(base_scale, base_scale);
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    context.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, canvas.clientWidth, canvas.clientHeight);
    context.scale(1/base_scale, 1/base_scale);

    let pin, pin_idx;
    pin_list.textContent = '';
    context.fillStyle = 'rgba(255, 0, 0, 255)';
    dots.forEach((dot, idx) => {
        context.fillRect(dot.x, dot.y, 1, 1);

        pin = document.createElement("div");
        pin.classList.add("pin");
        pin.style.left = dot.x / base_scale - 15 + "px";
        pin.style.top = dot.y / base_scale - 48 + "px";
        pin.addEventListener("contextmenu", (e) => toggle_window(e, true));

        pin_idx = document.createElement("span");
        pin_idx.innerHTML = (idx+1).toString();
        pin.appendChild(pin_idx);
        pin.appendChild(pin_icon.cloneNode(true));

        pin_list.appendChild(pin);
    });
}

// mini-windowの描画
const mini_draw = () => {
    mini_context.clearRect(0, 0, mini_canvas.clientWidth, mini_canvas.clientHeight);
    mini_context.scale(scale, scale);
    mini_context.drawImage(img, window_origin.x - diff.x, window_origin.y - diff.y, mini_canvas.clientWidth, mini_canvas.clientHeight, 0, 0, mini_canvas.clientWidth, mini_canvas.clientHeight);
    mini_context.scale(1/scale, 1/scale);

    // 新規選択のドットは青
    mini_context.fillStyle = 'rgba(0, 0, 255, 255)';
    if(new_dot != null){
        mini_context.fillRect(scale * (diff.x + new_dot.x), scale * (diff.y + new_dot.y), scale, scale);
    }

    // 既に選ばれていたドットは赤
    mini_context.fillStyle = 'rgba(255, 0, 0, 255)';
    dots.forEach(dot => {
        mini_context.fillRect(scale * (diff.x + dot.x - window_origin.x), scale * (diff.y + dot.y - window_origin.y), scale, scale);
    });
}

// mini-windowの開閉切り替え
const toggle_window = (e, flg) => {
    e.preventDefault();
    e.stopPropagation();

    mini_window.style.display = "none";
    is_open = false;

    // store new_dot (if any)
    if(new_dot != null){
        dots.push({
            x: window_origin.x + new_dot.x,
            y: window_origin.y + new_dot.y
        });
    }
    draw();

    // パラメータの初期化
    window_origin = {x:0, y:0};
    new_dot = null;
    diff = {x:0, y:0};
    scale = 6;
    move_flg = {up:false, left:false, down:false, right:false};
    zoom_flg = {in:false, out:false};
    clearInterval(watch_keys);

    // flgが経っている場合のみ次のwindowを開く
    if(flg) open_window(e);
}

// mini-windowを開く
const open_window = (e) => {
    let clickX = e.pageX;
    let clickY = e.pageY;

    let clientRect = canvas.getBoundingClientRect();
    let positionX = clientRect.left + window.pageXOffset;
    let positionY = clientRect.top + window.pageYOffset;

    window_origin.x = Math.trunc(clickX - positionX) * base_scale - SOURCE_WIDTH / 3; // 本当は2だが、なぜか3の方が切り取り位置が良くなるのでこうしている
    window_origin.y = Math.trunc(clickY - positionY) * base_scale - SOURCE_HEIGHT / 2.5;
    

    mini_window.style.left = (clickX - positionX) - mini_canvas.width / 2 + "px";
    mini_window.style.top = (clickY - positionY) - mini_canvas.height / 2 + "px";
    if(clickY - positionY < mini_canvas.height / 2){ // 上端
        mini_window.style.top = (clickY - positionY) - 100 + "px";
    }else if(clickY - positionY > clientRect.height - mini_canvas.height / 2){ // 下端
        mini_window.style.top = (clickY - positionY) - mini_canvas.height + 50 + "px";
    }
    if(clickX - positionX > clientRect.width - mini_canvas.width / 2){ // 右端
        mini_window.style.left = (clickX - positionX) - mini_canvas.width + 100 + "px";
    }
    
    mini_window.style.display = "block";
    is_open = true;
    
    mini_draw();
    setInterval(watch_keys, 20);
}

// 点を選ぶ
const mini_select_point = (e) => {
    let clickX = e.pageX;
    let clickY = e.pageY;

    let clientRect = mini_canvas.getBoundingClientRect();
    let positionX = clientRect.left + window.pageXOffset;
    let positionY = clientRect.top + window.pageYOffset;

    let x = Math.trunc((clickX - positionX) / scale - diff.x);
    let y = Math.trunc((clickY - positionY) / scale - diff.y);

    if(new_dot != null && (new_dot.x == x && new_dot.y == y)){ // 新規ドットが再び選ばれて消される場合
        new_dot = null;
    }else{
        let picked_dot = null;
        dots.forEach(dot => {
            if(dot.x - window_origin.x == x && dot.y - window_origin.y == y){
                picked_dot = dot;
            }
        });

        if(picked_dot != null){ // 旧ドットが選ばれて消される場合
            dots = dots.filter(d => d != picked_dot);
        }else{ // 新しいドットが選ばれる場合
            new_dot = {x:x, y:y};
        }
    }

    mini_draw();
}

// 点を消す
const redo = (e) => {
    e.preventDefault();
    if(dots != []){
        dots.pop();
        draw();
    }
}
