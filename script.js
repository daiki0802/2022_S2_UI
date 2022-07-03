/* パラメータ */
// 画像から切り取る範囲
const SOURCE_WIDTH = 90;
const SOURCE_HEIGHT = 60;
// 移動
const MOVE_STEP = 1;
// 拡大
const MAX_SCALE = 8;
const SCALE_STEP = 0.1;

/* グローバル変数 */
let canvas, context, mini_window, mini_canvas, mini_context, pin_list;
let img = new Image();
let mini_img = new Image();
let dots = [];
let base_scale; // canvasに対するimgの拡大率

// mini-window関連
let window_origin = {x:0, y:0};
let local_dot = null;
let diff = {x:0, y:0}; // 動いたことによるずれ
let scale = 6; // 拡大率
let move_flg = {up:false, left:false, down:false, right:false};
let zoom_flg = {in:false, out:false};
let is_open = false;


window.onload = () => {
    document.onselectstart = () => false; // 選択を無効化

    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    mini_window = document.getElementById("mini-window");
    mini_canvas = document.getElementById("mini-canvas");
    mini_context = mini_canvas.getContext("2d");
    
    pin_list = document.getElementById("pin_list");

    canvas.addEventListener("click", (e) => toggle_window(e, false));
    canvas.addEventListener("contextmenu", (e) => toggle_window(e, true));

    mini_canvas.addEventListener("click", mini_select_point);
    mini_window.addEventListener("contextmenu", (e) => toggle_window(e, true));

    img.src = "image.jpg";
    img.onload = () => {
        base_scale = img.naturalWidth / canvas.clientWidth;
        console.log(canvas.width, canvas.height, base_scale);
        draw();
    }
}

// canvasの描画
const draw = () => {
    context.scale(base_scale, base_scale);
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    context.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, canvas.clientWidth, canvas.clientHeight);
    context.scale(1/base_scale, 1/base_scale);

    context.fillStyle = 'rgba(255, 0, 0, 255)';
    dots.forEach(dot => {
        context.fillRect(dot.x * base_scale, dot.y * base_scale, 1, 1);

        let pin = document.createElement("div");
        pin.classList.add("pin");
        pin.style.left = dot.x + 20.5 + "px"; // todo: なぜこの数字で良いのか...?
        pin.style.top = dot.y - 25 + "px";
        pin_list.appendChild(pin);
    });
}

// mini-windowの描画
const mini_draw = () => {
    mini_context.clearRect(0, 0, mini_canvas.clientWidth, mini_canvas.clientHeight);
    mini_context.scale(scale, scale);
    mini_context.drawImage(img, window_origin.x - diff.x, window_origin.y - diff.y, mini_canvas.clientWidth, mini_canvas.clientHeight, 0, 0, mini_canvas.clientWidth, mini_canvas.clientHeight);
    mini_context.scale(1/scale, 1/scale);

    mini_context.fillStyle = 'rgba(255, 0, 0, 255)';
    if(local_dot != null){
        mini_context.fillRect(scale * (diff.x + local_dot.x), scale * (diff.y + local_dot.y), scale, scale);
    }
    // dots_local.forEach(dot => {
    //     mini_context.fillRect(scale * (diff.x + dot.x), scale * (diff.y + dot.y), scale, scale);
    // });
}

// mini-windowの開閉切り替え
const toggle_window = (e, flg) => {
    e.preventDefault();
    e.stopPropagation();

    mini_window.style.display = "none";
    is_open = false;

    // store local_dot (if any)
    if(local_dot != null){
        console.log(window_origin, diff, local_dot);
        dots.push({
            x: (window_origin.x + local_dot.x) / base_scale,
            y: (window_origin.y + local_dot.y) / base_scale
        });
    }
    draw();

    // initialize
    mini_context.clearRect(0, 0, mini_canvas.clientWidth, mini_canvas.clientHeight);
    diff = {x:0, y:0};
    scale = 6;
    local_dot = null;
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
    

    mini_window.style.left = (clickX - positionX) - mini_canvas.width / 3 + "px";
    mini_window.style.top = (clickY - positionY) - mini_canvas.height / 2 + "px";
    console.log(clickY - positionY);
    if(clickY - positionY < mini_canvas.height / 2){ // 上端
        mini_window.style.top = (clickY - positionY) - 50 + "px";
    }else if(clickY - positionY > clientRect.height - mini_canvas.height / 2){ // 下端
        console.log("hoge");
        mini_window.style.top = (clickY - positionY) - mini_canvas.height + 50 + "px";
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

    let xx = Math.trunc((clickX - positionX) / scale - diff.x);
    let yy = Math.trunc((clickY - positionY) / scale - diff.y);
    
    console.log(xx, yy);

    if(local_dot != null && ((local_dot.x-xx)*(local_dot.x-xx) + (local_dot.y-yy)*(local_dot.y-yy)) < 1){
        local_dot = null;
    }else{
        local_dot = {x:xx, y:yy};
    }
    // let picked_dot = null;
    // dots_local.forEach(dot => {
    //     if(((dot.x-xx)*(dot.x-xx) + (dot.y-yy)*(dot.y-yy)) < 1){
    //         picked_dot = dot;
    //         console.log("picked");
    //     }
    // });

    // if(picked_dot != null){
    //     dots_local = dots_local.filter((d) => {
    //         return (d != picked_dot);
    //     });
    // }else{
    //     dots_local.push({x:xx, y:yy});
    // }

    mini_draw();
}

// キー操作の設定
document.addEventListener("keydown", (e) => {
    switch(e.key){
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
            e.preventDefault();
            e.ctrlKey ? zoom_flg.out = true : zoom_flg.in = true;
            return;
        case "c":
            return;
        case "Escape":
            toggle_window(e, false);
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
        case "e":
            zoom_flg.in = false;
            zoom_flg.out = false;
            return;
        case "p":
            print_img();
            return;
        default: return;
    }
});

// キーボード操作で変わったフラグに応じて描画
const watch_keys = () => {
    // move
    if(move_flg.up) diff.y += MOVE_STEP;
    if(move_flg.left) diff.x += MOVE_STEP;
    if(move_flg.down) diff.y -= MOVE_STEP;
    if(move_flg.right) diff.x -= MOVE_STEP;

    // zoom
    if(zoom_flg.in){
        scale += SCALE_STEP;
        if(scale > MAX_SCALE) scale = MAX_SCALE;
    }else if(zoom_flg.out){
        scale -= SCALE_STEP;
        if(scale <= 1) scale = 1;
    }
    mini_draw();
}

// 画像を出力
const print_img = () => {
    let a = document.createElement('a');
	a.href = canvas.toDataURL('image/jpeg', 1.0);
	a.download = 'zoomclick.jpg';
	a.click();
}
