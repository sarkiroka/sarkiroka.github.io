/**
 *
 * @author sarkiroka on 2017.12.09.
 */
var dirty = 0;

loadDefault(init);

// mouse event vars
var selected_node = null,
	selected_link = null,
	mousedown_link = null,
	mousedown_node = null,
	mouseup_node = null;

function resetMouseVars() {
	mousedown_node = null;
	mouseup_node = null;
	mousedown_link = null;
}
function init(nodes, links) {
	do {
		var svgs = document.body.querySelectorAll('svg');
		if (svgs.length) {
			document.body.removeChild(svgs[0]);
		}
	} while (svgs.length);
	s = {
		colors: d3.scale.category10()
	};
	s.force = d3.layout.force()
		.nodes(nodes)
		.links(links)
		.size([window.innerWidth, window.innerHeight])
		.linkDistance(150)
		.charge(-500)
		.on('tick', function tick() {
				// draw directed edges with proper padding from node centers
				s.path.attr('d', function (d) {
					var deltaX = d.target.x - d.source.x,
						deltaY = d.target.y - d.source.y,
						dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
						normX = deltaX / dist,
						normY = deltaY / dist,
						sourcePadding = d.left ? 17 : 12,
						targetPadding = d.right ? 17 : 12,
						sourceX = d.source.x + (sourcePadding * normX),
						sourceY = d.source.y + (sourcePadding * normY),
						targetX = d.target.x - (targetPadding * normX),
						targetY = d.target.y - (targetPadding * normY);
					return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
				});

				s.circle.attr('transform', function (d) {
					return 'translate(' + d.x + ',' + d.y + ')';
				});
			}
		);
	s.svg = d3.select('body')
		.append('svg')
		.attr('oncontextmenu', 'return false;')
		.attr('width', window.innerWidth)
		.attr('height', window.innerHeight);

	s.svg.append('svg:defs').append('svg:marker')
		.attr('id', 'end-arrow')
		.attr('class', 'graph')
		.attr('viewBox', '0 -5 10 10')
		.attr('refX', 20) // milyen messze van a nyil
		.attr('markerWidth', 3)
		.attr('markerHeight', 10)
		.attr('orient', 'auto')
		.append('svg:path')
		.attr('d', 'M0,-5L10,0L0,5')
		.attr('fill', '#000');

	s.svg.append('svg:defs').append('svg:marker')
		.attr('id', 'start-arrow')
		.attr('class', 'graph')
		.attr('viewBox', '0 -5 10 10')
		.attr('refX', 4) // nem a start cucc, max a dupla
		.attr('markerWidth', 3)
		.attr('markerHeight', 3)
		.attr('orient', 'auto')
		.append('svg:path')
		.attr('d', 'M10,-5L0,0L10,5')
		.attr('fill', '#000');

	s.dragSvg = d3.behavior.zoom()
		.on('zoom', function(){
			console.log('z',d3.event.scale);
			d3.selectAll('.graph').attr('transform', 'scale(' + d3.event.scale + ')');
			return true;
		})
		.on('zoomstart', function(){
			console.log('zs')
		})
		.on('zoomend', function(){
			console.log('ze')
		});
	s.svg.call(s.dragSvg).on('dblclick.zoom', null);

// line displayed when dragging new nodes
	s.drag_line = s.svg.append('svg:path')
		.attr('class', 'link dragline hidden graph')
		.attr('d', 'M0,0L0,0');

// handles to link and node element groups
	s.path = s.svg.append('svg:g').selectAll('path');
	s.circle = s.svg.append('svg:g').selectAll('g');

	s.svg.on('mousedown', mousedown)
		.on('mousemove', mousemove)
		.on('mouseup', mouseup);
	d3.select(window)
		.on('keydown', keydown)
		.on('keyup', keyup);
	restart();

	// update graph (called when needed)
	function restart() {
		// path (link) group
		s.path = s.path.data(links);

		// update existing links
		s.path.classed('selected', function (d) {
				return d === selected_link;
			})
			.style('marker-start', function (d) {
				return d.left ? 'url(#start-arrow)' : '';
			})
			.style('marker-end', function (d) {
				return d.right ? 'url(#end-arrow)' : '';
			});


		// add new links
		s.path.enter().append('svg:path')
			.attr('class', 'link graph')
			.classed('selected', function (d) {
				return d === selected_link;
			})
			.style('marker-start', function (d) {
				return d.left ? 'url(#start-arrow)' : '';
			})
			.style('marker-end', function (d) {
				return d.right ? 'url(#end-arrow)' : '';
			})
			.on('mousedown', function (d) {
				if (d3.event.ctrlKey) return;

				// select link
				mousedown_link = d;
				if (mousedown_link === selected_link) selected_link = null;
				else selected_link = mousedown_link;
				selected_node = null;
				restart();
			});

		// remove old links
		s.path.exit().remove();


		// circle (node) group
		// NB: the function arg is crucial here! nodes are known by id, not by index!
		s.circle = s.circle.data(nodes, function (d) {
			return d.id;
		});

		// update existing nodes (reflexive & selected visual states)
		s.circle.selectAll('circle')
			.style('fill', function (d) {
				return (d === selected_node) ? d3.rgb(s.colors(d.id)).brighter().toString() : s.colors(d.id);
			})
			.classed('reflexive', function (d) {
				return d.reflexive;
			});

		// add new nodes
		var g = s.circle.enter().append('svg:g');

		g.append('svg:circle')
			.attr('class', 'node graph')
			.attr('r', 30) // kör sugár
			.style('fill', function (d) {
				return (d === selected_node) ? d3.rgb(s.colors(d.id)).brighter().toString() : s.colors(d.id);
			})
			.style('stroke', function (d) {
				return d3.rgb(s.colors(d.id)).darker().toString();
			})
			.classed('reflexive', function (d) {
				return d.reflexive;
			})
			.on('mouseover', function (d) {
				if (!mousedown_node || d === mousedown_node) return;
				// enlarge target node
				d3.select(this).attr('transform', 'scale(1.1)');
			})
			.on('mouseout', function (d) {
				if (!mousedown_node || d === mousedown_node) return;
				// unenlarge target node
				d3.select(this).attr('transform', '');
			})
			.on('mousedown', function (d) {
				if (d3.event.ctrlKey) return;

				// select node
				mousedown_node = d;
				if (mousedown_node === selected_node) selected_node = null;
				else selected_node = mousedown_node;
				selected_link = null;

				// reposition drag line
				s.drag_line
					.style('marker-end', 'url(#end-arrow)')
					.classed('hidden', false)
					.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);

				restart();
			})
			.on('mouseup', function (d) {
				if (!mousedown_node) return;

				// needed by FF
				s.drag_line
					.classed('hidden', true)
					.style('marker-end', '');

				// check for drag-to-self
				mouseup_node = d;
				if (mouseup_node === mousedown_node) {
					resetMouseVars();
					return;
				}

				// unenlarge target node
				d3.select(this).attr('transform', '');

				// add link to graph (update if exists)
				// NB: links are strictly source < target; arrows separately specified by booleans
				var source, target, direction;
				if (mousedown_node.id < mouseup_node.id) {
					source = mousedown_node;
					target = mouseup_node;
					direction = 'right';
				} else {
					source = mouseup_node;
					target = mousedown_node;
					direction = 'left';
				}

				var link;
				link = links.filter(function (l) {
					return (l.source === source && l.target === target);
				})[0];

				if (link) {
					link[direction] = true;
				} else {
					link = {source: source, target: target, left: false, right: false};
					link[direction] = true;
					links.push(link);
					dirty++;
				}

				// select new link
				selected_link = link;
				selected_node = null;
				restart();
			});

		// show node IDs
		g.append('svg:text')
			.attr('x', 0)
			.attr('y', 4)
			.attr('class', 'id graph')
			.text(function (d) {
				return d.title;
			});

		// remove old nodes
		s.circle.exit().remove();

		// set the graph in motion
		s.force.start();
	}

	function mousedown() {
		// prevent I-bar on drag
		//d3.event.preventDefault();

		// because :active only works in WebKit?
		s.svg.classed('active', true);

		if (d3.event.ctrlKey || mousedown_node || mousedown_link) return;

		// insert new node at point
		var point = d3.mouse(this),
			node = {
				id: ('' + Math.random()).replace('0.', ''),
				reflexive: false,
				title: '<title>',
				description: '<description>'
			};
		node.x = point[0];
		node.y = point[1];
		nodes.push(node);
		dirty++;

		restart();
	}

	function mousemove() {
		if (!mousedown_node) return;

		// update drag line
		s.drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);

		restart();
	}

	function mouseup() {
		if (mousedown_node) {
			// hide drag line
			s.drag_line
				.classed('hidden', true)
				.style('marker-end', '');
		}

		// because :active only works in WebKit?
		s.svg.classed('active', false);

		// clear mouse event vars
		resetMouseVars();
	}

	function spliceLinksForNode(node) {
		var toSplice = s.links.filter(function (l) {
			return (l.source === node || l.target === node);
		});
		toSplice.map(function (l) {
			s.links.splice(links.indexOf(l), 1);
			dirty++;
		});
	}

// only respond once per keydown
	var lastKeyDown = -1;

	function keydown() {
		d3.event.preventDefault();

		if (lastKeyDown !== -1) return;
		lastKeyDown = d3.event.keyCode;

		// ctrl
		if (d3.event.keyCode === 17) {
			s.circle.call(s.force.drag);
			s.svg.classed('ctrl', true);
		}

		if (!selected_node && !selected_link) {
			switch (d3.event.keyCode) {
				case 116: // F5
					location.reload();
					break;
				default:
					console.log('Unhadled key', d3.event.keyCode);
			}
			return;
		}
		switch (d3.event.keyCode) {
			case 8: // backspace
			case 46: // delete
				if (selected_node) {
					nodes.splice(nodes.indexOf(selected_node), 1);
					dirty++;
					spliceLinksForNode(selected_node);
				} else if (selected_link) {
					links.splice(links.indexOf(selected_link), 1);
					dirty++;
				}
				selected_link = null;
				selected_node = null;
				restart();
				break;
			case 66: // B
				if (selected_link) {
					// set link direction to both left and right
					selected_link.left = true;
					selected_link.right = true;
				}
				restart();
				break;
			case 76: // L
				if (selected_link) {
					// set link direction to left only
					selected_link.left = true;
					selected_link.right = false;
				}
				restart();
				break;
			case 82: // R
				if (selected_node) {
					// toggle node reflexivity
					selected_node.reflexive = !selected_node.reflexive;
				} else if (selected_link) {
					// set link direction to right only
					selected_link.left = false;
					selected_link.right = true;
				}
				restart();
				break;
			case 116: // F5
				location.reload();
				break;
			default:
				console.log('unhandled key with selected item', d3.event.keyCode);
		}
	}

	function keyup() {
		lastKeyDown = -1;

		// ctrl
		if (d3.event.keyCode === 17) {
			s.circle
				.on('mousedown.drag', null)
				.on('touchstart.drag', null);
			s.svg.classed('ctrl', false);
		}
	}

	document.getElementById('download').addEventListener('click', function (e) {
		e.preventDefault();
		saveToFile();
	});
	function saveToFile(callback) {
		var json = convertToJSON(nodes, links);
		var blob = new Blob([json], {type: 'text/plain;charset=utf-8'});
		if (typeof callback == 'function') {
			// not working: saveAs.onwriteend = callback;
			setTimeout(callback, 500);
		}
		saveAs(blob, 'data.json');
		dirty = 0;
	}

	document.getElementById('fileupload').addEventListener('change', function onChange(event) {
			if (event.target.files && event.target.files.length) {
				if (dirty) {
					var answer = confirm(dirty + ' nem mentett módosítás van még, menti?');
					if (answer) {
						saveToFile(doRead);
					} else {
						doRead();
					}
				} else {
					doRead();
				}
			}
			function doRead() {
				var reader = new FileReader();
				reader.onload = function onReaderLoad(event) {
					var data = JSON.parse(event.target.result);
					var result = convertToNodesAndLinks(data);
					init(result.nodes, result.links);
				};
				reader.readAsText(event.target.files[0]);
			}
		}
	);
	window.onbeforeunload = function (e) {
		var retValue = null;
		if (dirty) {
			retValue = dirty + ' nem mentett módosítás van még';
		}
		return retValue;
	}

}

function loadDefault(callback) {
	$.getJSON('data.json', function (data) {
		var result = convertToNodesAndLinks(data);
		callback(result.nodes, result.links);
	});
}
function convertToNodesAndLinks(data) {
	var keys = Object.keys(data);
	var nodes = keys.map(key=> {
		return {id: key, reflexive: false, title: data[key].title, description: data[key].description}
	});
	links = [];
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		var sourceObject = data[key];
		if (sourceObject.to && sourceObject.to.length) {
			var source = nodes.filter(node=>node.id == key)[0];
			for (var j = 0; j < sourceObject.to.length; j++) {
				var toKey = sourceObject.to[j];
				var target = nodes.filter(node=>node.id == toKey)[0];
				links.push({source, target, left: false, right: true});
			}
		}
	}
	return {nodes, links};
}
function convertToJSON(nodes, links) {
	var json = {};
	nodes.forEach(node=>json[node.id] = {title: node.title, description: node.description});
	links.forEach(link=> {
		var sourceObject = json[link.source.id];
		var targetId = link.target.id;
		if (!sourceObject.to) {
			sourceObject.to = [];
		}
		sourceObject.to.push(targetId);
	});
	return JSON.stringify(json, null, '\t');
}
