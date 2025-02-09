try{ JL = JL; } catch(e){ JL = {}; }

JL.sudoku = function( p ){ this.initialize( p || {} ); };

JL.sudoku.prototype.initialize = function( p ){
	var self = this;

	this.rows             = "ABCDEFGHI";
	this.digits           = "123456789";
	this.min_givens       = 17; 
	this.nr_squares       = 81;
	this.blank_char       = '.';
	this.squares          = this.cross( this.rows, this.digits );
	this.units            = this.get_all_units( this.rows, this.digits );
	this.square_units_map = this.get_square_units_map( this.squares, this.units );
	this.square_peers_map = this.get_square_peers_map( this.squares, this.square_units_map );

	this.generate( JL.functions.clamp( Math.round( p.difficulty || JL.functions.random_number( 17, 81 ) ), 17, 81 ) );

	this.board_grid = this.board_string_to_grid( this.board );

	this.solutions = JL.functions.filter_duplicates([
		this.solve( this.board ),
		this.solve( this.board, true ),
	]).map( b => self.board_string_to_grid( b ) );
}

JL.sudoku.prototype.generate = function( difficulty ){
	var difficulty = JL.functions.clamp( difficulty, this.min_givens, this.nr_squares + 1 );

	var candidates = this.get_candidates_map( JL.functions.get_filled_array( '.', this.nr_squares ).join('') );
	
	var shuffled_squares = this.shuffle( this.squares );
	for( var si in shuffled_squares ){
		var square = shuffled_squares[si];
		
		var rand_candidate_idx = this.rand_range(candidates[square].length);
		var rand_candidate = candidates[square][rand_candidate_idx];
		if( !this.assign( candidates, square, rand_candidate ) ) break;
		
		var single_candidates = [];
		for( var si in this.squares ){
			var square = this.squares[si];
			
			if( candidates[square].length == 1 ){
				single_candidates.push(candidates[square]);
			}
		}
		
		if( single_candidates.length >= difficulty && this.strip_dups(single_candidates).length >= 8 ){
			this.board = "";
			var givens_idxs = [];
			for( var i in this.squares ){
				var square = this.squares[i];
				if(candidates[square].length == 1){
					this.board += candidates[square];
					givens_idxs.push(i);
				}
				else {
					this.board += this.blank_char;
				}
			}
			
			var nr_givens = givens_idxs.length;
			if(nr_givens > difficulty){
				givens_idxs = this.shuffle(givens_idxs);
				for(var i = 0; i < nr_givens - difficulty; ++i){
					var target = parseInt(givens_idxs[i]);
					this.board = this.board.substr( 0, target ) + this.blank_char + this.board.substr( target + 1 );
				}
			}
			
			if( this.solve( this.board ) ) return this.board;
		}
	}
	
	this.board = this.generate( difficulty );
	return this.board;
};

JL.sudoku.prototype.solve = function( board, reverse ){
	var report = this.validate_board(board);
	if( report !== true ) throw report;
	
	var nr_givens = 0;
	for(var i in board){
		if(board[i] !== this.blank_char && this.digits.includes( board[i] ) ){
			++nr_givens;
		}
	}
	if( nr_givens < this.min_givens ) throw "Too few givens. Minimum givens is " + this.min_givens;

	reverse = reverse || false;

	var result = this.search( this.get_candidates_map( board ), reverse );
	
	if( result ){
		var solution = "";
		for( var square in result ) solution += result[square];
		return solution;
	}
	return false;
};

JL.sudoku.prototype.get_candidates = function( board ){	
	var report = this.validate_board( board );
	if( report !== true ) throw report;
	
	var candidates_map = this.get_candidates_map(board);
	
	if( !candidates_map ) return false;
	
	var rows    = [];
	var cur_row = [];
	var i = 0;
	for( var square in candidates_map ){
		var candidates = candidates_map[square];
		cur_row.push( candidates );
		if( i % 9 == 8 ){
			rows.push( cur_row );
			cur_row = [];
		}
		++i;
	}
	return rows;
};

JL.sudoku.prototype.get_candidates_map = function(board){
	var report = this.validate_board(board);
	if( report !== true ) throw report;
	
	var candidate_map = {};
	var squares_values_map = this.get_square_vals_map( board );
	
	for( var si in this.squares ){
		candidate_map[ this.squares[si] ] = this.digits;
	}
	
	for( var square in squares_values_map ){
		var val = squares_values_map[square];
		
		if( this.digits.includes( val ) ){
			var new_candidates = this.assign( candidate_map, square, val );
			
			if( !new_candidates ) return false;
		}
	}
	
	return candidate_map;
};

JL.sudoku.prototype.search = function( candidates, reverse ){	
	if( !candidates ) return false;
	
	var reverse = reverse || false;
	
	var max_nr_candidates = 0;
	var max_candidates_square = null;
	for( var si in this.squares ){
		var square = this.squares[si];
		
		var nr_candidates = candidates[square].length;
			
		if( nr_candidates > max_nr_candidates ){
			max_nr_candidates = nr_candidates;
			max_candidates_square = square;
		}
	}
	if( max_nr_candidates === 1 ) return candidates;
	
	var min_nr_candidates = 10;
	var min_candidates_square = null;
	for( si in this.squares ){
		var square = this.squares[si];
		
		var nr_candidates = candidates[square].length;
		
		if( nr_candidates < min_nr_candidates && nr_candidates > 1 ){
			min_nr_candidates = nr_candidates;
			min_candidates_square = square;
		}
	}
	
	var min_candidates = candidates[min_candidates_square];
	if( !reverse ){
		for(var vi in min_candidates){
			var val = min_candidates[vi];
			
			var candidates_copy = JSON.parse(JSON.stringify(candidates));
			var candidates_next = this.search( this.assign( candidates_copy, min_candidates_square, val ) );
			
			if( candidates_next ) return candidates_next;
		}
	}
	else {
		for( var vi = min_candidates.length - 1; vi >= 0; --vi ){
			var val = min_candidates[vi];
			
			var candidates_copy = JSON.parse(JSON.stringify(candidates));
			var candidates_next = this.search(
				this.assign( candidates_copy, min_candidates_square, val ), 
				reverse
			);
			
			if( candidates_next ) return candidates_next;
		}
	}

	return false;
};

JL.sudoku.prototype.assign = function( candidates, square, val ){
	var other_vals = candidates[square].replace(val, "");

	for( var other_val of other_vals ){
		if( !this.eliminate( candidates, square, other_val ) ) return false;
	}

	return candidates;
};

JL.sudoku.prototype.eliminate = function( candidates, square, val ){
	if( !candidates[square].includes( val ) ) return candidates;

	candidates[square] = candidates[square].replace(val, '');
	   
	var nr_candidates = candidates[square].length;
	if( nr_candidates === 1 ){
		var target_val = candidates[square];
		
		for( var pi in this.square_peers_map[square] ){
			var peer = this.square_peers_map[square][pi];
					
			if( !this.eliminate( candidates, peer, target_val ) ) return false;
		}
	}

	if( nr_candidates === 0 ) return false;
	
	for( var ui in this.square_units_map[square] ){
		var unit = this.square_units_map[square][ui];
		
		var val_places = [];
		for( var si in unit ){
			var unit_square = unit[si];
			if( candidates[unit_square].includes( val ) ) val_places.push( unit_square );
		}
		
		if( !val_places.length ) return false;
		else if( val_places.length === 1 ){
			if( !this.assign( candidates, val_places[0], val ) ) return false;
		}
	}
	
	return candidates;
};

JL.sudoku.prototype.get_square_vals_map = function( board ){
	var squares_vals_map = {};
	
	if( board.length != this.squares.length ) throw "Board/squares length mismatch.";
	else {
		for( var i in this.squares ){
			squares_vals_map[ this.squares[i] ] = board[i];
		}
	}
	
	return squares_vals_map;
};

JL.sudoku.prototype.get_square_units_map = function(squares, units){
	var square_unit_map = {};

	for( var si in squares ){
		var cur_square = squares[si];

		var cur_square_units = [];

		for(var ui in units){
			var cur_unit = units[ui];

			if( cur_unit.indexOf(cur_square) !== -1 ){
				cur_square_units.push(cur_unit);
			}
		}

		square_unit_map[cur_square] = cur_square_units;
	}

	return square_unit_map;
};

JL.sudoku.prototype.get_square_peers_map = function( squares, units_map ){
	var square_peers_map = {};

	for(var si in squares){
		var cur_square = squares[si];
		var cur_square_units = units_map[cur_square];

		var cur_square_peers = [];

		for( var sui in cur_square_units ){
			var cur_unit = cur_square_units[sui];

			for( var ui in cur_unit ){
				var cur_unit_square = cur_unit[ui];

				if( cur_square_peers.indexOf(cur_unit_square) === -1 && cur_unit_square !== cur_square ){
					cur_square_peers.push(cur_unit_square);
				}
			}
		}
		
		square_peers_map[cur_square] = cur_square_peers;
	}

	return square_peers_map;
};

JL.sudoku.prototype.get_all_units = function( rows, cols ){
	var units = [];

	for( var ri in rows ) units.push( this.cross( rows[ri], cols     ) );
	for( var ci in cols ) units.push( this.cross( rows    , cols[ci] ) );

	var row_squares = ["ABC", "DEF", "GHI"];
	var col_squares = ["123", "456", "789"];
	for( var rsi in row_squares ){
		for( var csi in col_squares ){
			units.push( this.cross( row_squares[rsi], col_squares[csi] ) );
		}
	}

	return units;
};

JL.sudoku.prototype.board_string_to_grid = function( board ){
	var rows = [];
	var cur_row = [];
	for( var i in board ){
		cur_row.push( board[i] );
		if( i % 9 == 8 ){
			rows.push( cur_row );
			cur_row = [];
		}
	}
	return rows;
};

JL.sudoku.prototype.board_grid_to_string = function( board_grid ){
	var board_string = "";
	for( var r = 0; r < 9; ++r ){
		for( var c = 0; c < 9; ++c ){
			board_string += board_grid[r][c];
		}   
	}
	return board_string;
};

JL.sudoku.prototype.validate_board = function( board ){	
	if( !board ) return "Empty board";
	
	if( board.length !== this.nr_squares ) return "Invalid board size. Board must be exactly " + this.nr_squares + " squares.";
	
	for( var i in board ){
		if( !this.digits.includes( board[i] ) && board[i] !== this.blank_char ){
			return "Invalid board character encountered at index " + i + ": " + board[i];
		}
	}
	
	return true;
};

JL.sudoku.prototype.cross = function( a, b ){
	var result = [];
	for( var ai in a ){
		for( var bi in b ) result.push( a[ai] + b[bi] );
	}
	return result;
};

JL.sudoku.prototype.shuffle = function( seq ){	
	var shuffled = [];
	for( var i = 0; i < seq.length; ++i ) shuffled.push(false);
	
	for( var i in seq ){
		var ti = this.rand_range(seq.length);
		
		while( shuffled[ti] ){
			ti = (ti + 1) > ( seq.length - 1 ) ? 0 : (ti + 1);
		}
		
		shuffled[ti] = seq[i];
	}
	
	return shuffled;
};

JL.sudoku.prototype.rand_range = function( max, min ){
	var min = min || 0;
	if( max ) return Math.floor( Math.random() * (max - min) ) + min;
	throw "Range undefined";
};

JL.sudoku.prototype.strip_dups = function( seq ){
	var seq_set = [];
	var dup_map = {};
	for( var i in seq ){
		var e = seq[i];
		if( !dup_map[e] ){
			seq_set.push(e);
			dup_map[e] = true;
		}
	}
	return seq_set;
};