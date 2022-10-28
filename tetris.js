/* tetris.js
   This file implements a Tetris-like game using D3.js.
   It requires an HTML SVG element to contain the game
   and a simple CSS file that specifies the text style
   and the circle outline color. */



/* Store a reference to the svg element and store
   its given width and height */
var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

/* Specify the width and height of the
   board in number of blocks */
var board_width = 10;
var board_height = 15;
var block_size = 30;

/* Specify the width of the board border, which is
   the colored area outside the board perimeter */
var border_width = 5;

/* Specify the width of the board padding, which is
   extra space within the interior of the board area
   (which keeps the pieces from visually touching
   the board edges) */
var padding_width = 3;

// Create the group element for the board
var board_area = svg.append("g")
  .attr("class", "board_area");

/* Create a colored rectangle that will serve as
   the exterior border around the board perimeter */
board_area.append("rect")
  .attr("width", board_width*block_size + 2*border_width + 2*padding_width)
  .attr("height", board_height*block_size + 2*border_width + 2*padding_width)
  .attr("fill", "#eee");

/* Create the board area itself, which is offset
   by the border width and has width and height
   that include the padding */
board_area.append("rect")
  .attr("x", border_width)
  .attr("y", border_width)
  .attr("width", board_width*block_size + 2*padding_width)
  .attr("height", board_height*block_size + 2*padding_width)
  .attr("fill", "#444");

/* The "active" piece will be drawn into the board
   area while the "settled" blocks will be drawn
   into the group defined here */
var static_group = svg.append("g")
  .attr("class", "static_group");

/* Create a text element to show the score
   and make it invisible to start */
var score_text = svg.append("text")
  .attr("class", "score")
  .attr("x", border_width + (board_width/2)*block_size + padding_width)
  .attr("y", border_width + (board_height/2)*block_size + padding_width)
  .attr("stroke", "black")
  .attr("stroke-width", "1px")
  .attr("text-anchor", "middle")
  .attr("opacity", 0)
  .text("Score: 0");

/* Define the configurations of the seven piece
   types, which are composed of four blocks each;
   the first array for each type contains the
   relative positions of the blocks in the piece's
   initial orientation, the second array contains
   the relative positions of the blocks when the
   piece has been rotated once, etc. */
var piece_pos_square = new Array(4);
piece_pos_square[0] = [[0,0], [1,0], [0,1], [1,1]]
piece_pos_square[1] = [[1,0], [1,1], [0,0], [0,1]]
piece_pos_square[2] = [[1,1], [0,1], [1,0], [0,0]]
piece_pos_square[3] = [[0,1], [0,0], [1,1], [1,0]]

var piece_pos_line = new Array(4);
piece_pos_line[0] = [[-1,0], [0,0], [1,0], [2,0]]
piece_pos_line[1] = [[0,-1], [0,0], [0,1], [0,2]]
piece_pos_line[2] = [[1,0], [0,0], [-1,0], [-2,0]]
piece_pos_line[3] = [[0,1], [0,0], [0,-1], [0,-2]]

var piece_pos_zigzag_down = new Array(4);
piece_pos_zigzag_down[0] = [[-1,0], [0,0], [0,1], [1,1]]
piece_pos_zigzag_down[1] = [[0,-1], [0,0], [-1,0], [-1,1]]
piece_pos_zigzag_down[2] = [[1,0], [0,0], [0,-1], [-1,-1]]
piece_pos_zigzag_down[3] = [[0,1], [0,0], [1,0], [1,-1]]

var piece_pos_zigzag_up = new Array(4);
piece_pos_zigzag_up[0] = [[-1,0], [0,0], [0,-1], [1,-1]]
piece_pos_zigzag_up[1] = [[0,-1], [0,0], [1,0], [1,1]]
piece_pos_zigzag_up[2] = [[1,0], [0,0], [0,1], [-1,1]]
piece_pos_zigzag_up[3] = [[0,1], [0,0], [-1,0], [-1,-1]]

var piece_pos_t = new Array(4);
piece_pos_t[0] = [[-1,0], [0,0], [1,0], [0,1]]
piece_pos_t[1] = [[0,-1], [0,0], [0,1], [-1,0]]
piece_pos_t[2] = [[1,0], [0,0], [-1,0], [0,-1]]
piece_pos_t[3] = [[0,1], [0,0], [0,-1], [1,0]]

var piece_pos_l = new Array(4);
piece_pos_l[0] = [[0,-1], [0,0], [0,1], [1,1]]
piece_pos_l[1] = [[1,0], [0,0], [-1,0], [-1,1]]
piece_pos_l[2] = [[0,1], [0,0], [0,-1], [-1,-1]]
piece_pos_l[3] = [[-1,0], [0,0], [1,0], [1,-1]]

var piece_pos_j = new Array(4);
piece_pos_j[0] = [[0,-1], [0,0], [0,1], [-1,1]]
piece_pos_j[1] = [[1,0], [0,0], [-1,0], [-1,-1]]
piece_pos_j[2] = [[0,1], [0,0], [0,-1], [1,-1]]
piece_pos_j[3] = [[-1,0], [0,0], [1,0], [1,1]]

/* Declare four variables that keep track of
   the game state:

     board_state: a two-dimensional array that
     tracks where there are blocks on the board;
     values of -1 mean that the board is empty
     in that space and all other values mean
     that the space is occupied by a block

     active_piece: an array that holds the
     "active" piece (the one the player is
     actively controlling)

     static_blocks: an array that holds the
     "static" blocks (the blocks that have
     reachced their final place on the board)

     block_counter: a counter that is incremented
     every time a block is transitioned from being
     "active" to "static" (see below)

     score: the player's current score, which is
     increased when lines are cleared */
var board_state,
    active_piece,
    static_blocks,
    block_counter,
    score;

// Add an event listener to deal with key presses
document.addEventListener('keydown', handle_keydown);

// Reset the board state and add a new active piece
reset_board();

// Draw the board in its current state
draw_board();

/* Create an interval that will trigger every
   half-second to update the game */
var interval_length = 500;
var interval_num = setInterval(update_game, interval_length);



/* FUNCTION: handle_keydown(event)
   This function updates the position or orientation
   of the active piece when the user presses a key */
function handle_keydown(event) {

  /* Prevent the default (scrolling) behavior if
   one of the arrow keys was pressed */
  if((event.keyCode >= 37) && (event.keyCode <= 40)) {
    event.preventDefault();
  }

  // Handle a left keypress
  if(event.keyCode == 37) {

    // Move the piece one space to the left
    active_piece[0].position[0] -= 1;

    /* If the piece collides with something
       in its new location, move it back;
       otherwise, redraw the board */
    if (check_collision() == true) {
      active_piece[0].position[0] += 1;
    }
    else {
      draw_board();
    }

  }
  // Handle an up keypress
  else if(event.keyCode == 38) {

    // Rotate the piece into its next orientation
    active_piece[0].orientation = (active_piece[0].orientation+1)%4;

    /* If the piece collides with something
       in its new orientation, rotate it back;
       otherwise, redraw the board */
    if (check_collision() == true) {
      if(active_piece[0].orientation == 0) {
        active_piece[0].orientation = 3;
      }
      else {
        active_piece[0].orientation -= 1;
      }
    }
    else {
      draw_board();
    }

  }
  // Handle a right keypress
  else if(event.keyCode == 39) {

    // Move the piece one space to the right
    active_piece[0].position[0] += 1;

    /* If the piece collides with something
       in its new location, move it back;
       otherwise, redraw the board */
    if (check_collision() == true) {
      active_piece[0].position[0] -= 1;
    }
    else {
      draw_board();
    }

  }
  // Handle a down keypress
  else if (event.keyCode == 40) {

    // Temporarily clear the interval
    clearInterval(interval_num);

    /* Repeatedly move the active piece down
       one space until it has a collision */
    do {
      active_piece[0].position[1] += 1;
    } while (check_collision() == false);

    // Move the piece back up one space
    active_piece[0].position[1] -= 1;

    // Redraw the board
    draw_board();

    // Restart the interval
    interval_num = setInterval(update_game, interval_length);

  }

}



/* FUNCTION: reset_board()
   This function initializes the board state to be
   blank, clears the arrays that keep track of the
   "active" and "static" pieces/blocks, resets the
   block counter, and then adds a new active piece
   to the top of the board */
function reset_board() {

  /* Initialize a two-dimensional array with the
     given dimensions of the board; fill the array
     with values of -1, which represent empty spaces */
  board_state = new Array(board_width);
  for(let i = 0; i < board_width; i++) {
    board_state[i] = new Array(board_height).fill(-1);
  }

  // Clear the array that keeps track of the active piece
  active_piece = [];

  // Clear the array that keeps track of the static blocks
  static_blocks = [];

  // Reset the block counter to zero
  block_counter = 0;

  // Reset the player's score to zero
  score = 0;

  // Add a new piece to the top of the board
  add_new_piece();

}



/* FUNCTION: draw_board()
   This functions draws or redraws the board
   given the current game state */
function draw_board() {

  /* Create the transition to use when moving and
     rotating the active piece */
  const t = svg.transition().duration(125);

  /* Create the transition to use when shifting
     static blocks down after one or more lines
     have been cleared */
  const t2 = svg.transition().duration(500);

  /* Create the transition to use when fading
     out the score text */
  const t3 = svg.transition().duration(3000);

  /* Create or update the active piece within the board
     area; the piece is identified by the combination of
     its type, orientation, and position */
  board_area.selectAll("g")
    .data(active_piece, d => (d.type + d.orientation + d.position))
    .join(
      enter => {

        // Create the overall group for the piece
        let piece_group = enter.append("g")
          .attr("transform", (d,i) =>
                  "translate(" +
                  (d.position[0]*block_size + block_size/2) + "," +
                  (d.position[1]*block_size + block_size/2) + ")");

        // Create and position the circle for the first block
        piece_group.append("circle")
          .attr("class", "first_block")
          .attr("r", block_size/2 - 2)
          .attr("fill", (d,i) => d.color)
          .attr("stroke-width", 4)
          .attr("cx", (d,i) => {
            return get_relative_position(d.type, d.orientation, 0)[0] * block_size
              + border_width + padding_width;
          })
          .attr("cy", (d,i) => {
            return get_relative_position(d.type, d.orientation, 0)[1] * block_size
              + border_width + padding_width;
          });

        // Create and position the circle for the second block
        piece_group.append("circle")
          .attr("class", "second_block")
          .attr("r", block_size/2 - 2)
          .attr("fill", (d,i) => d.color)
          .attr("stroke-width", 4)
          .attr("cx", (d,i) => {
            return get_relative_position(d.type, d.orientation, 1)[0] * block_size
              + border_width + padding_width;
          })
          .attr("cy", (d,i) => {
            return get_relative_position(d.type, d.orientation, 1)[1] * block_size
              + border_width + padding_width;
          });

        // Create and position the circle for the third block
        piece_group.append("circle")
          .attr("class", "third_block")
          .attr("r", block_size/2 - 2)
          .attr("fill", (d,i) => d.color)
          .attr("stroke-width", 4)
          .attr("cx", (d,i) => {
            return get_relative_position(d.type, d.orientation, 2)[0] * block_size
              + border_width + padding_width;
          })
          .attr("cy", (d,i) => {
            return get_relative_position(d.type, d.orientation, 2)[1] * block_size
              + border_width + padding_width;
          });

        // Create and position the circle for the fourth block
        piece_group.append("circle")
          .attr("class", "fourth_block")
          .attr("r", block_size/2 - 2)
          .attr("fill", (d,i) => d.color)
          .attr("stroke-width", 4)
          .attr("cx", (d,i) => {
            return get_relative_position(d.type, d.orientation, 3)[0] * block_size
              + border_width + padding_width;
          })
          .attr("cy", (d,i) => {
            return get_relative_position(d.type, d.orientation, 3)[1] * block_size
              + border_width + padding_width;
          });

      },
      update => {

        // Update the position of the piece's overall group
        update.transition(t)
          .attr("transform", (d,i) =>
                "translate(" +
                (d.position[0]*block_size + block_size/2) + "," +
                (d.position[1]*block_size + block_size/2) + ")");

        // Update the position of the circle for the first block
        update.select("circle.first_block").transition(t)
          .attr("cx", (d,i) => {
            return get_relative_position(d.type, d.orientation, 0)[0] * block_size
              + border_width + padding_width;
          })
          .attr("cy", (d,i) => {
            return get_relative_position(d.type, d.orientation, 0)[1] * block_size
              + border_width + padding_width;
          });

        // Update the position of the circle for the second block
        update.select("circle.second_block").transition(t)
          .attr("cx", (d,i) => {
            return get_relative_position(d.type, d.orientation, 1)[0] * block_size
              + border_width + padding_width;
          })
          .attr("cy", (d,i) => {
            return get_relative_position(d.type, d.orientation, 1)[1] * block_size
              + border_width + padding_width;
          });

        // Update the position of the circle for the third block
        update.select("circle.third_block").transition(t)
          .attr("cx", (d,i) => {
            return get_relative_position(d.type, d.orientation, 2)[0] * block_size
              + border_width + padding_width;
          })
          .attr("cy", (d,i) => {
            return get_relative_position(d.type, d.orientation, 2)[1] * block_size
              + border_width + padding_width;
          });

        // Update the position of the circle for the fourth block
        update.select("circle.fourth_block").transition(t)
          .attr("cx", (d,i) => {
            return get_relative_position(d.type, d.orientation, 3)[0] * block_size
              + border_width + padding_width;
          })
          .attr("cy", (d,i) => {
            return get_relative_position(d.type, d.orientation, 3)[1] * block_size
              + border_width + padding_width;
          });

      },
      exit => exit.remove()
    );

  // Add or update the static blocks within the static area
  static_group.selectAll("g")
    .data(static_blocks, d => d.id)
    .join(
      enter => {

        // Add the overall groups for the static blocks
        let block_group = enter.append("g")
          .attr("transform", (d,i) =>
                  "translate(" +
                  (d.position[0]*block_size + block_size/2 + border_width + padding_width) + "," +
                  (d.position[1]*block_size + block_size/2 + border_width + padding_width) + ")");

        // Add the circles for the static blocks
        block_group.append("circle")
          .attr("r", block_size/2 - 2)
          .attr("fill", (d,i) => d.color)
          .attr("stroke-width", 4);

      },
      update => {

        // Update the positions of the groups for the static blocks
        update.transition(t2)
          .attr("transform", (d,i) =>
                  "translate(" +
                  (d.position[0]*block_size + block_size/2 + border_width + padding_width) + "," +
                  (d.position[1]*block_size + block_size/2 + border_width + padding_width) + ")");

      },
      exit => exit.remove()
    );

  // If the score text is visible, fade it out
  if(score_text.attr("opacity") == 1) {
      score_text.transition(t3).attr("opacity", 0);
  }

}



/* FUNCTION: update_game()
   This function is called every half-second to
   update the game state and redraw the board */
function update_game() {

  // Move the active piece down by one space
  active_piece[0].position[1] += 1;

  /* If there was a collision, do the following */
  if (check_collision() == true) {

    // Move the active piece back up by one space
    active_piece[0].position[1] -= 1;

    /* Get the absolute positions of the blocks
       that make up the active piece */
    let block_abs_pos = get_absolute_positions(active_piece[0].type,
      active_piece[0].orientation, active_piece[0].position);

    /* Create new objects in the static_blocks array that
       represent each of the four blocks in the currently
       active piece */
    for(let block_num = 0; block_num < 4; block_num++) {

      /* Create a new object that stores the block's position
         and color; the ID (unique across all blocks on the
         board) will be used to identify this object later
         when clearing lines */
      let new_piece = {
        id: block_counter,
        position: [block_abs_pos[block_num][0], block_abs_pos[block_num][1]],
        color: active_piece[0].color
      };

      // Add the object to the static_blocks array
      static_blocks.push(new_piece);

      /* Record the ID in the board_state array, which allows
         this object to be found later and also signals that
         this space on the board is filled */
      board_state[block_abs_pos[block_num][0]][block_abs_pos[block_num][1]] = block_counter;

      /* Increment the block counter to be used in
         assigning the next unique ID */
      block_counter += 1;

    }

    // Remove the active piece from the active_piece array
    active_piece.splice(0,1);

    /* Redraw the board so that the newly added static blocks
       will appear before they are potentially removed or
       re-positioned */
    draw_board();

    // Clear any full lines from the board
    clear_lines();

    // Add a new active piece to the top of the board
    add_new_piece();

    /* If the newly added piece already has a collision,
       reset the board because the game is over */
    if(check_collision()==true) {
      reset_board();
    }

  }

  // Redraw the board
  draw_board();

}



/* FUNCTION: add_new_piece()
   This function adds a new piece to the top
   of the board */
function add_new_piece() {

  // Create an empty object that represents the new piece
  let new_piece = {};

  // Get a random integer in the range [0,6]
  let new_piece_type = Math.floor(Math.random() * 6);

  // Set the piece's type and color based on the integer
  switch (new_piece_type) {
    case 0:
      new_piece.type = "line";
      new_piece.color = "blue";
      break;
    case 1:
      new_piece.type = "zigzagdown";
      new_piece.color = "orange";
      break;
    case 2:
      new_piece.type = "zigzagup";
      new_piece.color = "maroon";
      break;
    case 3:
      new_piece.type = "square";
      new_piece.color = "green";
      break;
    case 4:
      new_piece.type = "t";
      new_piece.color = "red";
      break;
    case 5:
      new_piece.type = "l";
      new_piece.color = "purple";
      break;
    case 6:
      new_piece.type = "j";
      new_piece.color = "orangered";
      break;
  }

  // Set the piece's initial position
  new_piece.position = [Math.floor(board_width/2), 1];

  // Set the piece's initial orientation
  new_piece.orientation = 0;

  // Add the new piece to the active_piece array
  active_piece.push(new_piece);

}



/* FUNCTION: clear_lines()
   This function repeatedly scans board lines from
   bottom to top and, when a line is complete, removes
   the relevant blocks and shifts the remaining blocks
   down one space */
function clear_lines() {

  // Temporarily clear the interval
  clearInterval(interval_num);

  /* Declare a variable to keep track of whether
     there is a "missing block" (an empty space)
     on the current row being checked (see below) */
  let missing_block;

  /* Declare a variable to keep track of the
     number of lines cleared */
  let num_lines_cleared = 0;

  /* Repeat the following as long as a line has
     previously been cleared */
  do {

    /* Consider each line moving from the bottom
       of the board to the top */
    for(let row_num = board_height-1; row_num > 0; row_num--) {

      // Reset missing_block to false
      missing_block = false;

      /* Scan the current row and set missing_block to
         true if there are any empty spaces */
      for(let col_num = 0; col_num < board_width; col_num++) {
        if(board_state[col_num][row_num] == -1) {
          missing_block = true;
          break;
        }
      }

      /* If the current line has no missing blocks,
         do the following */
      if(missing_block==false) {

        // Loop through each column on the board
        for(let col_num = 0; col_num < board_width; col_num++) {

          /* Search through the static_blocks array to find the
             object whose ID matches the entry in board_state
             corresonding to this column and row */
          for(let i = 0; i < static_blocks.length; i++) {

            // When the match is found, remove the object from static_blocks
            if(static_blocks[i].id == board_state[col_num][row_num]) {
              static_blocks.splice(i,1);
              break;
            }

          }

        }

        /* Shift all of the values in board_state down one
           row, beginning with the row above the cleared
           row and moving to the top */
        for(let move_row=row_num-1; move_row > 0; move_row--) {
          for(let col_num = 0; col_num < board_width; col_num++) {
            board_state[col_num][move_row+1] = board_state[col_num][move_row];
          }
        }

        /* Shift the positions of all of the remaining objects
           in static_blocks down one row, as long as their
           current position is above the cleared row */
        for(let i = 0; i < static_blocks.length; i++) {
          if(static_blocks[i].position[1] < row_num) {
            static_blocks[i].position[1] += 1;
          }
        }

        // Increase the number of lines cleared
        num_lines_cleared += 1;

        /* Break out of the outer for loop, which will cause
           execution to restart from the top of the do loop */
        break;

      }

    }

  } while(missing_block==false);

  /* If one or more lines were cleared, increase
     the player's score and make the score text
     visible */
  if(num_lines_cleared > 0) {
    score += (10*num_lines_cleared) + (5*(num_lines_cleared**2));
    score_text.text("Score: " + score);
    score_text.attr("opacity", 1);
  }

  // Restart the interval
  interval_num = setInterval(update_game, interval_length);

}



/* FUNCTION: check_collision()
   This function checks whether the active piece
   is (1) outside the boundaries of the board or
   (2) on top of an existing block on the board;
   it then returns true/false accordingly */
function check_collision() {

  /* Get the absolute positions of the blocks
     that make up the active piece */
  let block_abs_pos = get_absolute_positions(active_piece[0].type,
    active_piece[0].orientation, active_piece[0].position);

  // Loop through each of the blocks to check for collisions
  for(let block_num = 0; block_num < 4; block_num++) {

    /* Return true if the block is outside the
       boundaries of the board */
    if ((block_abs_pos[block_num][1] == board_height) ||
       (block_abs_pos[block_num][0] < 0) ||
       (block_abs_pos[block_num][0] == board_width)) {
      return true;
    }

    /* Return true if the block is in the same position
       as a static block already on the board */
    if (board_state[block_abs_pos[block_num][0]][block_abs_pos[block_num][1]] != -1) {
      return true;
    }

  }

  // Return false if no collision was found
  return false;

}



/* FUNCTION: get_relative_position(type, orientation, block_num)
   This function returns the relative position (as a 2-element
   array [x,y]) for the given piece type, piece orientation, and
   block number */
function get_relative_position(type, orientation, block_num) {

  /* Set the variable piece_pos to one of the seven
     configuration arrays defined above depending on
     the given piece type */
  let piece_pos = [];
  switch(type) {
    case "square":
      piece_pos = piece_pos_square;
      break;
    case "line":
      piece_pos = piece_pos_line;
      break;
    case "zigzagdown":
      piece_pos = piece_pos_zigzag_down;
      break;
    case "zigzagup":
      piece_pos = piece_pos_zigzag_up;
      break;
    case "t":
      piece_pos = piece_pos_t;
      break;
    case "l":
      piece_pos = piece_pos_l;
      break;
    case "j":
      piece_pos = piece_pos_j;
      break;
  }

  /* Extract and return the relative position for
     the given piece orientation and block number */
  return piece_pos[orientation][block_num];

}



/* FUNCTION: get_absolute_positions()
   This function returns the absolute positions (as an array
   of 2-element arrays [x,y]) of the four blocks within
   the active piece */
function get_absolute_positions(type, orientation, position) {

  // Define an array to hold the absolute block positions
  let block_abs_pos = new Array(4);

  // Loop through the four blocks in the active piece
  let block_rel_pos;
  for(let block_num = 0; block_num < 4; block_num++) {

    // Get the current block's relative position
    block_rel_pos = get_relative_position(type, orientation, block_num);

    /* Convert the relative position to an absolute board
       position given the overall position of the piece */
    block_abs_pos[block_num] = [position[0] + block_rel_pos[0],
      position[1] + block_rel_pos[1]];

  }

  // Return the array of absolute positions
  return block_abs_pos;

}
