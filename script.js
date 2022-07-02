let dragging = false;

// https://kuroeveryday.blogspot.com/2017/09/zoom-in-out-and-drag-to-move-on-canvas.html




let canvas, context, mini_window, mini_canvas, mini_context;
let img = new Image();
let mini_img = new Image();
let origin = {x:0, y:0}; // 描画の原点
let scale = 6; // 拡大率
let base_scale; // canvasに対するimgの拡大率
let is_open = false;

let window_origin = {x:0, y:0};
let local_dot = null;
let dots = [];

/* パラメータ */
// 画像から切り取る範囲
const SOURCE_WIDTH = 90;
const SOURCE_HEIGHT = 60;
// 移動
const MOVE_STEP = 0.25;
// 拡大
const MAX_SCALE = 5;
const SCALE_STEP = 0.05;

window.onload = () => {

    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    mini_window = document.getElementById("mini-window");
    mini_canvas = document.getElementById("mini-canvas");
    mini_context = mini_canvas.getContext("2d");

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

const draw = () => {
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    context.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, canvas.clientWidth, canvas.clientHeight);

    context.fillStyle = 'rgba(255, 0, 0, 255)';
    dots.forEach(dot => {
        context.fillRect(dot.x, dot.y, 1, 1);
    });
}

const mini_draw = () => {
    mini_context.clearRect(0, 0, mini_canvas.clientWidth, mini_canvas.clientHeight);
    mini_context.scale(scale, scale)
    mini_context.drawImage(img, window_origin.x - origin.x, window_origin.y - origin.y, mini_canvas.clientWidth, mini_canvas.clientHeight, 0, 0, mini_canvas.clientWidth, mini_canvas.clientHeight);
    mini_context.scale(1/scale, 1/scale);

    mini_context.fillStyle = 'rgba(255, 0, 0, 255)';
    if(local_dot != null){
        mini_context.fillRect(scale * (origin.x + local_dot.x), scale * (origin.y + local_dot.y), scale, scale);
    }
    // dots_local.forEach(dot => {
    //     mini_context.fillRect(scale * (origin.x + dot.x), scale * (origin.y + dot.y), scale, scale);
    // });
}


const open_window = (e) => {
    e.preventDefault();
    e.stopPropagation();

    let clickX = e.pageX;
    let clickY = e.pageY;

    let clientRect = canvas.getBoundingClientRect();
    let positionX = clientRect.left + window.pageXOffset;
    let positionY = clientRect.top + window.pageYOffset;

    window_origin.x = Math.trunc(clickX - positionX) * base_scale - SOURCE_WIDTH / 2;
    window_origin.y = Math.trunc(clickY - positionY) * base_scale - SOURCE_HEIGHT / 2;
    

    mini_window.style.top = (clickY - positionY) + "px";
    mini_window.style.left = (clickX - positionX) + "px";
    // [todo] 画面外に出ないように
    mini_window.style.display = "block";

    is_open = true;
    mini_draw();
    setInterval(watch_keys, 20);
}

const toggle_window = (e, flg) => {
    e.preventDefault();
    e.stopPropagation();

    mini_window.style.display = "none";
    is_open = false;

    // store local_dot (if any)
    if(local_dot != null){
        console.log(window_origin, origin, local_dot);
        dots.push({
            x: (window_origin.x + local_dot.x) / base_scale,
            y: (window_origin.y + local_dot.y) / base_scale
        });
    }
    draw();

    // initialize
    mini_context.clearRect(0, 0, mini_canvas.clientWidth, mini_canvas.clientHeight);
    origin = {x:0, y:0};
    scale = 6;
    local_dot = null;
    clearInterval(watch_keys);

    if(flg) open_window(e);
}

const mini_select_point = (e) => {
    let clickX = e.pageX;
    let clickY = e.pageY;

    let clientRect = mini_canvas.getBoundingClientRect();
    let positionX = clientRect.left + window.pageXOffset;
    let positionY = clientRect.top + window.pageYOffset;

    let xx = Math.trunc((clickX - positionX) / scale - origin.x);
    let yy = Math.trunc((clickY - positionY) / scale - origin.y);
    
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

let move_flg = {up:false, left:false, down:false, right:false};
let zoom_flg = {in:false, out:false};
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

const watch_keys = () => {
    // move
    if(move_flg.up) origin.y += MOVE_STEP;
    if(move_flg.left) origin.x += MOVE_STEP;
    if(move_flg.down) origin.y -= MOVE_STEP;
    if(move_flg.right) origin.x -= MOVE_STEP;

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

const print_img = () => {
    let a = document.createElement('a');
	a.href = canvas.toDataURL('image/jpeg', 0.85);
	a.download = 'zoomclick.jpg';
	a.click();
}