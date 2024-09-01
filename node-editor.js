const	MIN_ZOOM_VALUE = 5;
const	MAX_ZOOM_VALUE = 50;
const	CELLS_IN_LINE_COUNT = 60;
const	DEFAULT_CELL_SIZE = 10.0;
const NODE_BORDER_RADIUS = 5;
const NODE_TITLE_MARGIN_TOP = 20;
const NODE_TITLE_MARGIN_LEFT = 20;
const NODE_CW_RADIUS = 2;
const NODE_PIN_HEIGHT = 20;
var pallete = {
	"background-color":"#1f1f1f",
	"lines-color":"#171717",
	"lines-color-2":"#1717177d",
	"node-background":"#333333",
	"node-text":"#848484",
};

function __Vector2(x, y) {
	return {x, y};
}

function Vec2Add(v1, v2) {
	return __Vector2(v1.x+v2.x, v1.y+v2.y);
}
function Vec2Sub(v1, v2) {
	return __Vector2(v1.x-v2.x, v1.y-v2.y);
}

class NodeCutWire {
	_color = "#77ff77"
	_name = "put"
	constructor() { }

	name(name) {
		this._name = name;
		return this;
	}
	color(color) {
		this._color = color;
		return this;
	}
	draw(ctx, parent, x, y) {
		ctx.fillStyle = this._color;
		parent.drawPoint(x, y, NODE_CW_RADIUS);
	}
}

class NodeElement {
	name = "Node";
	/**
	 * @type {NodeCutWire[]}
	 */
	#in  = [];
	/**
	 * @type {NodeCutWire[]}
	 */
	#out = [];
	bounds = {x: 0, y: 0, width: 350, height: 500}
	min = null;
	max = null;
	/**
	 * @type {NodeEditor}
	 */
	_Parent = null;
	_buffer = {};
	constructor() {}
	
	setInputs(...inputs) {
		this.#in = inputs;
		let count = Math.max(this.#in.length,this.#out.length);
		this.bounds.height = this.bounds.y+NODE_TITLE_MARGIN_TOP+(NODE_PIN_HEIGHT*(count+6))
	}
	
	setOutputs(...outputs) {
		this.#out = outputs;
		let count = Math.max(this.#in.length,this.#out.length);
		this.bounds.height = this.bounds.y+NODE_TITLE_MARGIN_TOP+(NODE_PIN_HEIGHT*(count+6))
	}
	/**
	 * 
	 * @param {CanvasRenderingContext2D} ctx 
	 * @param {NodeEditor} parent 
	 */
	draw(ctx, parent) {
		if (this._Parent == null) { this._Parent = parent; }
		if (this.min == null || this.max == null) {
			this.calc(parent);
		}
		ctx.fillStyle = pallete["node-background"];
		ctx.strokeStyle = pallete["node-background"];
		parent.drawRoundedRectPC(
			this.min,
			this.max,
			NODE_BORDER_RADIUS
		);
		ctx.fillStyle = pallete["node-text"];
		ctx.strokeStyle = pallete["node-text"];
		parent.drawTextPC(this.name, 
			this.bounds.x+NODE_TITLE_MARGIN_LEFT*4,
			this.bounds.y+(this.bounds.height-NODE_TITLE_MARGIN_TOP*3)*4
		)
		// parent.DrawLineP(
		// 	this.min.x,
		// 	this.min.y+NODE_TITLE_MARGIN_TOP*3,
		// 	this.max.x,
		// 	this.min.y+NODE_TITLE_MARGIN_TOP*3
		// );
		this.#in.forEach((e, i) => {
			e.draw(ctx, parent, 
				this.bounds.x+(NODE_TITLE_MARGIN_LEFT)*4, 
				this.bounds.y+(NODE_TITLE_MARGIN_TOP+(NODE_PIN_HEIGHT*i))*10
			);
			ctx.fillStyle = pallete["node-text"];
			parent.drawTextPC(e._name, 
				this.bounds.x+(NODE_TITLE_MARGIN_LEFT)*8, 
				this.bounds.y+(NODE_TITLE_MARGIN_TOP+(NODE_PIN_HEIGHT*i))*9
			)
		});
		this.#out.forEach((e, i) => {
			e.draw(ctx, parent, 
				this.bounds.x+(this.bounds.width-NODE_TITLE_MARGIN_LEFT)*4, 
				this.bounds.y+(NODE_TITLE_MARGIN_TOP+(NODE_PIN_HEIGHT*i))*10
			);
			ctx.fillStyle = pallete["node-text"];
			const match = /(?<value>\d+\.?\d*)/;
			const newSize = parseFloat((this._Parent.ctx.staticFont.match(match).groups.value))*e._name.length;
			parent.drawTextPC(e._name, 
				this.bounds.x+(this.bounds.width-newSize*1.7)*4, 
				this.bounds.y+(NODE_TITLE_MARGIN_TOP+(NODE_PIN_HEIGHT*i))*8.5
			)
		});

	}
	/**
	 * 
	 * @param {{x:number,y: number}} pos
	 * @param {NodeEditor} parent 
	 */
	isInBox(pos, parent) {
		if (this._Parent == null) { this._Parent = parent; }
		if (this.min == null || this.max == null) {
			this.calc(parent);
		}
		return (true
			&& this.min.x > pos.x 
			&& this.min.y < pos.y 
			&& this.max.x < pos.x
			&& this.max.y > pos.y
		);
	}

	move(dv, zoom) {
		this.bounds.x += -dv.x * zoom;
		this.bounds.y += dv.y * zoom;
		this.calc();
	}

	calc() {
		if (this._Parent == null) {return;}
		let [_max, _min] = this._Parent.getNodeSize(
			{x: this.bounds.x, y: this.bounds.y}, 
			{x: this.bounds.width, y: this.bounds.height}
		)
		this.min = _min;
		this.max = _max;
	}
}

class NodeEditor {
	_Zoom = 5;
	_Offset = {x:0, y:0};
	_LastMousePosition = {x:0, y:0};
	/**
	 * @type {NodeElement[]}
	 */
	_Nodes = [];
	_draggedNode = null;
	_compensive_offset = {x: 0, y: 0};


	constructor() { }


	/**
	 * @param {number} value
	 */
	set Zoom(value) {
		this._Zoom = value > MAX_ZOOM_VALUE ? MAX_ZOOM_VALUE : value < MIN_ZOOM_VALUE ? MIN_ZOOM_VALUE : value;
		this._Nodes.forEach((_node)=>_node.calc());
	}

	get Zoom() {
		return this._Zoom;
	}

	/**
	 * 
	 * @param {HTMLCanvasElement} canvas 
	 */
	registerCanvas(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		// this.ctx = this.canvas.getContext("webgl2-2d");
		this.resize();
		this.repaint();
		this.is_pressed = false;
		this.pressed_key = 0;
		this.canvas.addEventListener("mousedown", (ev) => {
			this.is_pressed = true;
			this.pressed_key = ev.button;
			this._LastMousePosition = null;
			if (ev.button == 2) {
				// let _index = this._Nodes.findIndex((_node)=>_node.isInBox(ev, this));
				// if (_index != -1) {
					
				// }
			}
		});
		this.canvas.addEventListener("dblclick", (ev) => {
			let _a = this._Nodes.some((_node)=>_node.isInBox(ev, this));
			if (!_a) {
				this.addNode(new NodeElement());
			}
		});
		this.canvas.addEventListener("mousemove", (ev) => {
			if (!this.is_pressed) {return;}
			if (this.pressed_key == 1) {
				this.DragGrid(ev.x, ev.y);
			} 
			if (this.pressed_key == 0) {
				this.DragNodes(ev.x, ev.y);
			}
		});
		this.canvas.addEventListener("mouseup", (ev) => {
			this.is_pressed = false;
			this._Nodes.forEach((_node)=>_node.calc());
			this._draggedNode = null;
			this._compensive_offset = {x: 0, y: 0};
		});
		this.canvas.addEventListener("wheel", (ev) => {
			this.OnScroll(ev.deltaY/100);
		});
		this.ctx.staticFont = this.ctx.font;
		setInterval(() => this.repaint(), 0);
	}

	repaint() {
		this.fill(pallete["background-color"]);
		this.drawLines();
		this._Nodes.forEach((_node)=>_node.draw(this.ctx, this));
	}

	drawLines() {
		let lodLevel = parseInt(Math.log(this._Zoom) / 1.5);
		this.DrawLODLines(lodLevel > 0 ? lodLevel : 0);
	}

	DrawLODLines(level) {
		let step0 = Math.pow(10, level);
		let halfCount = step0 * CELLS_IN_LINE_COUNT / 2 * 10;
		let length = halfCount * DEFAULT_CELL_SIZE;
		let offsetX = (this._Offset.x / DEFAULT_CELL_SIZE) / (step0 * step0) * step0;
		let offsetY = (this._Offset.y / DEFAULT_CELL_SIZE) / (step0 * step0) * step0;
		this.ctx.lineWidth = 1;
		this.ctx.strokeStyle = pallete["lines-color-2"];
		for (let i = -halfCount; i <= halfCount; i += step0) {
			this.DrawLine(
				this.GridToGUI(__Vector2(-length + offsetX * DEFAULT_CELL_SIZE, (i + offsetY) * DEFAULT_CELL_SIZE)),
				this.GridToGUI(__Vector2(length + offsetX * DEFAULT_CELL_SIZE, (i + offsetY) * DEFAULT_CELL_SIZE))
			);
			this.DrawLine(
				this.GridToGUI(__Vector2((i + offsetX) * DEFAULT_CELL_SIZE, -length + offsetY * DEFAULT_CELL_SIZE)),
				this.GridToGUI(__Vector2((i + offsetX) * DEFAULT_CELL_SIZE, length + offsetY * DEFAULT_CELL_SIZE))
			);
		}
		offsetX = offsetX / (10 * step0) * 10 * step0;
		offsetY = offsetY / (10 * step0) * 10 * step0;
		this.ctx.lineWidth = 1;
		this.ctx.strokeStyle = pallete["lines-color"];
		for (let i = -halfCount; i <= halfCount; i += step0 * 10) {
			this.DrawLine(
				this.GridToGUI(__Vector2(-length + offsetX * DEFAULT_CELL_SIZE, (i + offsetY) * DEFAULT_CELL_SIZE)),
				this.GridToGUI(__Vector2(length + offsetX * DEFAULT_CELL_SIZE, (i + offsetY) * DEFAULT_CELL_SIZE))
			);
			this.DrawLine(
				this.GridToGUI(__Vector2((i + offsetX) * DEFAULT_CELL_SIZE, -length + offsetY * DEFAULT_CELL_SIZE)),
				this.GridToGUI(__Vector2((i + offsetX) * DEFAULT_CELL_SIZE, length + offsetY * DEFAULT_CELL_SIZE))
			);
		}
	}
	
	OnScroll(speed) {
		this.Zoom += speed * this.Zoom * 0.1;
		this.repaint();
	}
	
	DrawLine(v1, v2) {
		this.ctx.beginPath();
		this.ctx.moveTo(v1.x, v1.y);
		this.ctx.lineTo(v2.x, v2.y);
		this.ctx.stroke();
	}
	
	DrawLineP(x1, y1, x2, y2) {
		this.ctx.beginPath();
		this.ctx.moveTo(x1-this._compensive_offset.x, y1-this._compensive_offset.y);
		this.ctx.lineTo(x2-this._compensive_offset.x, y2-this._compensive_offset.y);
		this.ctx.stroke();
	}

	GUIToGrid(vec) {
		return {
			x:  (vec.x  - ((this.canvas.width 	/ 2) * this._Zoom)) + this._Offset.x, 
			y:  (-vec.y - ((-this.canvas.height / 2) * this._Zoom)) + this._Offset.y
		};
	}

	GridToGUI(vec) {
		return {
			x: ((vec.x 	- this._Offset.x) / (this._Zoom))	+	(this.canvas.width 	/ 2 ), 
			y: ((-vec.y - this._Offset.y) / (this._Zoom))	+	(this.canvas.height / 2 ),
		};
	}
	GridToGUINV(x, y) {
		return [
			((x 	- this._Offset.x) / (this._Zoom))	+	(this.canvas.width 	/ 2 ), 
			((-y - this._Offset.y) / (this._Zoom))	+	(this.canvas.height / 2 ),
		];
	}

	Move(dv) {
		this._Offset.x += dv.x * this._Zoom;
		this._Offset.y += dv.y * this._Zoom;
	}
	DragGrid(x, y) {
		let curMousePosition = {x,y};
		if (this._LastMousePosition != null) {
			let dv = {
				x: this._LastMousePosition.x - curMousePosition.x,
				y: this._LastMousePosition.y - curMousePosition.y,
			};
			this.Move(dv);
			this._compensive_offset.x += dv.x;
			this._compensive_offset.y += dv.y;
			this.repaint();
		}
		this._LastMousePosition = curMousePosition;
	}
	DragNodes(x, y) {
		let touched = false;
		let curMousePosition = {x,y};
		if (this._LastMousePosition != null) {
			let dv = {
				x: this._LastMousePosition.x - curMousePosition.x,
				y: this._LastMousePosition.y - curMousePosition.y,
			};
			if (this._draggedNode != null) {
				this._draggedNode.move(dv, this._Zoom);
			} else {
				this._Nodes.forEach((_node)=>{
					if (_node.isInBox({x, y}, this)) {
						this._draggedNode = _node;
						_node.move(dv, this._Zoom);
					}
				});
			}
		}
		if (touched) {
			this.repaint();
		}
		this._LastMousePosition = curMousePosition;
	}
	fill(color) {
		this.ctx.fillStyle = color;
		this.ctx.fillRect(0,0,this.canvas.width, this.canvas.height);
	}

	drawPoint(x, y, r) {
		// ((x 	- this._Offset.x) / (this._Zoom))	+	  (this.canvas.width 	/ 2 ), 
		// 	((-y - this._Offset.y) / (this._Zoom))	+	(this.canvas.height / 2 ),
		this.ctx.beginPath();
		this.ctx.arc(
			(x-this._Offset.x)/(this._Zoom)+(this.canvas.width  / 2 ),
			(-y-this._Offset.y)/(this._Zoom)+(this.canvas.height / 2 ),
			r/(this._Zoom/20), 0, Math.PI*2
		);
		this.ctx.fill();
	}

	drawRect(v1, v2) {
		// this.ctx.fillRect(v1.x,v1.y,v2.x,v2.y);
		this.ctx.beginPath()
		this.ctx.moveTo(v1.x, v1.y);
		this.ctx.lineTo(v2.x, v1.y);
		this.ctx.lineTo(v2.x, v2.y);
		this.ctx.lineTo(v1.x, v2.y);
		this.ctx.fill();
	}
	drawRectP(v1, Size) {
		this.drawRect(...this.getNodeSize(v1, Size));
	}
	getNodeSize(pos, size) {
		return [this.GridToGUI(pos), this.GridToGUI({x:pos.x+(size.x*4), y: pos.y+(size.y*4)})]
	}
	drawText(text, x, y) {
		this.ctx.fillText(text, x, y);
	}
	drawTextP(text, x, y) {
		this.ctx.fillText(text, x-this._compensive_offset.x, y-this._compensive_offset.y);
	}
	drawTextPC(text, x, y) {
		const match = /(?<value>\d+\.?\d*)/;
		const newSize = parseFloat((this.ctx.staticFont.match(match).groups.value));
		this.ctx.font = this.ctx.font.replace(match, newSize/(this._Zoom/10));
		
		this.ctx.fillText(text, 
			(x-this._Offset.x)/(this._Zoom)+(this.canvas.width  / 2 ),
			(-y-this._Offset.y)/(this._Zoom)+(this.canvas.height / 2 ),
		);
	}
	drawRoundedRect(v1, v2, r) {
		this.ctx.beginPath()
		r = r/(this._Zoom/15);
		this.ctx.moveTo(v1.x+r, v1.y);
		this.ctx.arcTo(v2.x, v1.y, v2.x+r, v2.y+r, r);
		this.ctx.arcTo(v2.x, v2.y, v1.x+r, v2.y-r, r);
		this.ctx.arcTo(v1.x, v2.y, v1.x, v1.y-r, r);
		this.ctx.arcTo(v1.x, v1.y-r, v1.x-r, v1.y-r, r);
		this.ctx.fill();
	}
	drawRoundedRectC(v1, v2, r) {
		let v1x = v1.x - this._compensive_offset.x;
		let v1y = v1.y - this._compensive_offset.y;
		let v2x = v2.x - this._compensive_offset.x;
		let v2y = v2.y - this._compensive_offset.y;
		r = r/(this._Zoom/15);
		this.ctx.beginPath()
		this.ctx.moveTo(v1x, v1y+r);
		this.ctx.arcTo(v2x, v1y+r, v2x+r, v2y+r, r);
		this.ctx.arcTo(v2x, v2y, v1x+r, v2y-r, r);
		this.ctx.arcTo(v1x, v2y, v1x, v1y+r, r);
		this.ctx.arcTo(v1x, v1y+r, v1x-r, v1y+r, r);
		this.ctx.fill();
	}
	drawRoundedRectP(min, max, radius) {
		this.drawRoundedRect(min, max, radius);
	}
	drawRoundedRectPC(min, max, radius) {
		this.drawRoundedRectC(min, max, radius);
	}

	resize() {
		if (this.canvas == void 0) { return; }
		this.canvas.style.width = "100vw";
		this.canvas.style.height = "100vh";
		this.factor_1_ = 2; 
		let __cs = getComputedStyle(this.canvas);
		this.canvas.width = parseFloat(__cs.width);
		this.canvas.height = parseFloat(__cs.height);
		this.repaint();
		this.ctx.staticFont = this.ctx.font;
	}

	addNode(node) {
		this._Nodes.push(node);
	}
}

var nodeEditor = new NodeEditor();

window.addEventListener("load", function() {
	let ne = document.querySelector("canvas[node-editor]");
	nodeEditor.registerCanvas(ne);
	let test_node = new NodeElement();
	test_node.setInputs(new NodeCutWire());
	test_node.setOutputs(new NodeCutWire().name("outputs"));
	nodeEditor.addNode(test_node);
	let test_node2 = new NodeElement();
	test_node2.setInputs(new NodeCutWire());
	test_node2.setOutputs(new NodeCutWire().name("outputs"));
	nodeEditor.addNode(test_node2);
});

window.addEventListener("resize", function() {
	nodeEditor.resize();
})