PR.home = { arr_9 : [0,1,2,3,4,5,6,7,8], };

PR.home.load = function(){
	this.new_game();

	this.draw();
};

PR.home.new_game = function( p ){
	var p = p || {};

	this.game = new JL.sudoku({ difficulty : p.difficulty || 17 });

	this.values = [];
	this.notes  = [];
	for( var y = 0; y < 9; y++ ){
		var row       = [];
		var row_notes = [];
		for( var x = 0; x < 9; x++ ){
			var val = this.game.board[ x + ( 9 * y ) ];
			row.push( val );
			row_notes.push({});
			// row_notes.push({ 1 : 1, 2 : 1, 3 : 1, 4 : 1, 5 : 1, 6 : 1, 7 : 1, 8 : 1, 9 : 1, });
		}
		this.values.push( row );
		this.notes.push( row_notes );
	}

	this.update_completed_numbers();

	this.draw();
};

PR.home.show_new_game_popup = function(){
	var difficulty = prompt( 'Select difficulty -- integer from 17 (most difficult) to 81 (least difficult)' );
	if( difficulty !== null ) this.new_game({ difficulty });
};

PR.home.add_notes = function(){
	// var notes_to_add = this.game.get_candidates( this.game.board_grid_to_string( this.values ) );
	for( var y = 0; y < 9; y++ ){
		for( var x = 0; x < 9; x++ ){
			// for( var i of notes_to_add[ y ][ x ] ) this.notes[ y ][ x ][ i ] = true;
			if( this.values[ y ][ x ] == '.' ){
				this.notes[ y ][ x ] = Object.assign( this.notes[ y ][ x ], this.get_cell_auto_notes( x, y ) );
				console.log( this.notes[ y ][ x ] );
			}
		}
	}
	this.draw();
};

PR.home.get_cell_auto_notes = function( x, y ){
	var notes = {};

	var box_x_start = 3 * Math.floor( x / 3 );
	var box_y_start = 3 * Math.floor( y / 3 );

	var box_x_end = box_x_start + 3;
	var box_y_end = box_y_start + 3;

	for( var v = 1; v <= 9; v++ ){
		if( this.values.map( r => r[ x ] ).find( _ => _ == v ) ) continue;

		if( this.values[ y ].find( _ => _ == v ) ) continue;

		var in_box = false;
		for( var b_x = box_x_start; b_x < box_x_end; b_x++ ){
			if( in_box ) break;
			for( var b_y = box_y_start; b_y < box_y_end; b_y++ ){
				if( this.values[ b_y ][ b_x ] == v ){
					in_box = true;
					break;
				}
			}
		}
		
		if( !in_box ) notes[ v ] = true;
	}

	return notes;
};

PR.home.clean_up_notes = function(){
	for( var y = 0; y < 9; y++ ){
		for( var x = 0; x < 9; x++ ){
			if( this.values[ y ][ x ] == '.' ){
				var auto_notes = this.get_cell_auto_notes( x, y );
				for( var k in this.notes[ y ][ x ] ){
					if( !auto_notes[ k ] ) delete this.notes[ y ][ x ][ k ];
				}
			}
		}
	}
	this.draw();
};

PR.home.clear_notes = function(){
	for( var y = 0; y < 9; y++ ){
		for( var x = 0; x < 9; x++ ){
			for( var i = 1; i <= 9; i++ ) delete this.notes[ y ][ x ][ i ];
		}
	}
	this.draw();
};

PR.home.select_number = function( num, type ){
	this.selected_number      = num;
	this.selected_number_type = type;

	this.draw();
};

PR.home.apply_number = function( x, y ){
	if( this.selected_number_type ){
		switch( this.selected_number_type ){
			case 'value':
				this.notes[ y ][ x ] = {};
				if( this.values[ y ][ x ] == this.selected_number ) this.values[ y ][ x ] = '.';
				else                                                this.values[ y ][ x ] = this.selected_number;
				this.update_completed_numbers();
				this.clean_up_notes();
				break;
			case 'note':
				this.notes[ y ][ x ][ this.selected_number ] = !this.notes[ y ][ x ][ this.selected_number ];
				break;
		}

		this.draw();
	}
};

PR.home.update_completed_numbers = function(){
	var curr_board_string = this.game.board_grid_to_string( this.values );
	var solution_string   = this.game.board_grid_to_string( this.game.solution );

	this.completed_numbers = [];

	for( var i = 1; i <= 9; i++ ){
		
		var completed_counter = 0;
		for( var c_i = 0; c_i < curr_board_string.length; c_i++ ){
			if(
				( curr_board_string[ c_i ] == i && solution_string[ c_i ] != i ) ||
				( curr_board_string[ c_i ] != i && solution_string[ c_i ] == i )
			){
				completed_counter = 0;
				break;
			}
			else if( curr_board_string[ c_i ] == i && solution_string[ c_i ] == i ){
				completed_counter++;
			}
		}
		if( completed_counter == 9 ) this.completed_numbers.push( i );
	}
};

PR.home.is_valid_value = function( x, y, val ){
	return this.game.solution[ y ][ x ] == val;
};

PR.home.has_won = function(){
	return( this.game.board_grid_to_string( this.values ) == this.game.board_grid_to_string( this.game.solution ) );
};

PR.home.draw = function(){
	var self = this;

	$( "#content" ).html(
		'<div class="buttons">' + 
			[
				{ label : 'New Game'   , onclick : 'PR.home.show_new_game_popup();' },
				{ label : 'Add Notes'  , onclick : 'PR.home.add_notes();'   },
				{ label : 'Clear Notes', onclick : 'PR.home.clear_notes();' },
			].map(function( c ){
				return '<div class="button" onclick="' + c.onclick + '">' +
					c.label +
				'</div>';
			}).join('') +
		'</div>' +
		'<table class="board">' +
			self.arr_9.map(function( y ){
				return '<tr>' +
					self.arr_9.map(function( x ){
						var contents = '';
						var classes  = '';
						var val = self.values[ y ][ x ];
						if( val == '.' ){
							val = '';
							var notes = self.notes[ y ][ x ];
							if( notes ){
								contents = '<table class="cell-notes">' +
									[
										[1,2,3],
										[4,5,6],
										[7,8,9],
									].map(function( slots ){
										return '<tr>' +
											slots.map(function( slot ){
												return '<td>' + ( notes[ slot ] ? slot : '' ) + '</td>';
											}).join('') +
										'</tr>';
									}).join('') +
								'</table>';
							}
						}
						else{
							contents = val;
							if( self.game.board_grid[ y ][ x ] == val ){
								classes += 'original-value ';
								if( self.selected_number == val ) classes += ' selected';
							}
							else{
								if( self.is_valid_value( x, y, val ) ){
									classes += 'correct ';
									if( self.selected_number == val ) classes += ' selected';
								}
								else{
									classes += 'incorrect ';
								}
							}
						}
						return '<td class="' + classes + '" onclick="PR.home.apply_number(' + x + ', ' + y + ');">' + contents + '</td>';
					}).join('') +
				'</tr>';
			}).join('') +
		'</table>' +
		( this.has_won() ? '<div class="win">You Win!</div>' :
			'<div class="buttons">' + 
				this.arr_9.map(function( i ){
					var val = i + 1;
					var classes = '';
					if( self.selected_number_type == 'value' && self.selected_number == val ) classes += 'active ';
					if( self.completed_numbers.includes( val ) ) classes += ' completed';
					return '<div class="button number ' + classes + '" id="value-button-' + val + '" onclick="PR.home.select_number( ' + val + ', \'value\' );">' + 
						val +
					'</div>';
				}).join('') +
			'</div>' +
			'<div class="buttons">' + 
				this.arr_9.map(function( i ){
					var val = i + 1;
					var classes = '';
					if( self.selected_number_type == 'note' && self.selected_number == val ) classes += 'active ';
					if( self.completed_numbers.includes( val ) ) classes += ' completed';
					return '<div class="button number note ' + classes + '" id="note-button-' + val + '" onclick="PR.home.select_number( ' + val + ', \'note\' );">' + 
						val +
					'</div>';
				}).join('') +
			'</div>'
		)
	);
};

PR.home.load();