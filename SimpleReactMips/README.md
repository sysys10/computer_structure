# React MIPS Simulator

This project is a modern React implementation of the SimpleMIPS JavaScript simulator. It provides a web-based MIPS assembly language simulator with a clean, user-friendly interface built using Material UI components.

## Features

- **MIPS Assembly Editor**: Write and edit MIPS assembly code with syntax highlighting
- **Pipeline Visualization**: View the 5-stage pipeline execution with detailed state information
- **Register Display**: Monitor the values of all 32 MIPS registers in real-time
- **Memory Inspector**: Examine the contents of memory at specified addresses
- **Execution Controls**: Step through code, run continuously, or reset the simulation
- **Console Output**: View simulation output and error messages

## Project Structure

```
src/
├── App.tsx                   # Main application component
├── components/
│   └── ConsolePanel.tsx      # Console output display component
├── utils/
│   └── formatters.ts         # Utility functions for formatting
├── models/
│   ├── mips-simulator.ts     # Core simulator classes
│   └── assembler.ts          # Assembler implementation
└── main.tsx                  # Application entry point
```

## Implementation Details

### Core Simulator Components

The simulator is built around several key classes:

1. **Memory**: Manages the simulated MIPS memory space in chunks, supporting:

   - Byte, halfword, and word read/write operations
   - Big-endian memory organization
   - Memory latency simulation for cycle-accurate execution

2. **CPU**: Implements the MIPS processor with:

   - 32 general-purpose registers
   - 5-stage pipeline simulation (IF, ID, EX, MA, WB)
   - Pipeline hazard detection
   - Data forwarding for handling dependencies
   - Exception handling

3. **Assembler**: Translates MIPS assembly code to machine code:
   - Supports standard MIPS instructions
   - Handles labels and symbols
   - Supports directives for data section definition

### User Interface

The UI is built with Material UI components and organized into several panels:

1. **Control Panel**: Contains buttons for assembling, stepping, running, and resetting the simulation
2. **Assembly Editor**: Allows writing and editing MIPS assembly code
3. **Console Output**: Displays simulation messages, warnings, and errors
4. **Memory Inspector**: Shows memory contents at specified addresses
5. **Register Display**: Shows the current values of all registers
6. **Pipeline View**: Visualizes the state of each pipeline stage

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/react-mips-simulator.git

# Navigate to the project directory
cd react-mips-simulator

# Install dependencies
npm install
# or
yarn install
```

### Running the Application

```bash
# Start the development server
npm run dev
# or
yarn dev
```

Visit `http://localhost:5173` in your browser to use the simulator.

## Using the Simulator

1. **Write MIPS Assembly Code**: Enter your MIPS assembly code in the editor panel
2. **Assemble the Code**: Click "Assemble" to compile the code
3. **Execute the Program**:
   - Use "Step" to execute one instruction at a time
   - Use "Run" to execute continuously
   - Use "Reset" to reset the CPU state
4. **Observe Execution**:
   - Watch the register values change
   - View the pipeline stages
   - Check memory contents
   - Monitor the console for output messages

## Future Enhancements

- Full implementation of all MIPS instructions
- Improved assembly code editor with syntax highlighting
- Enhanced visualization of data dependencies
- Breakpoint support
- Performance optimizations for larger programs
- Save and load assembly programs
- Export execution traces
- Visual representation of memory layout and usage

## Credits

This project is based on the SimpleMIPS JavaScript simulator by Mianzhi Wang, rewritten and enhanced using modern React and TypeScript.
