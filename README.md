# K-Map Solver

An interactive web-based Karnaugh Map (K-Map) solver tool for simplifying Boolean expressions with support for truth tables and expression verification.

## Features

- **Interactive 4-Variable K-Map**: Click on cells to toggle between 0, 1, and "don't care" (X) states
- **Multiple Input Methods**:
  - Enter minterms and don't care terms
  - Enter maxterms and don't care terms
  - Use the truth table editor
  - Enter and verify Boolean expressions
- **Real-time Expression Simplification**: Automatically find the minimal Sum of Products (SOP) form
- **Group Visualization**: See how terms are grouped for simplification
- **Truth Table Integration**: View and edit the corresponding truth table
- **Cell Selection Tool**: Select specific cells to generate expressions from
- **Copy to Clipboard**: Easily copy the simplified Boolean expression

## Demo

The K-Map Solver offers an intuitive interface for working with Boolean logic:

1. Select an input method (minterms, maxterms, or truth table)
2. Enter your values or click cells in the K-Map
3. Get the simplified Boolean expression instantly

## Installation

No installation required! This is a client-side web application that runs entirely in your browser.

```
git clone https://github.com/yourusername/KMap-Check.git
cd KMap-Check
```

Then simply open `src/index.html` in your web browser.

## Usage

### Minterm Mode

1. Select "Minterms" from the input method options
2. Enter comma-separated minterms (e.g., "0, 1, 5, 15")
3. Optionally enter don't care terms
4. Click "Generate K-Map"

### Maxterm Mode

1. Select "Maxterms" from the input method options
2. Enter comma-separated maxterms
3. Optionally enter don't care terms
4. Click "Generate K-Map"

### Truth Table Mode

1. Select "Truth Table" from the input method options
2. Click on output cells in the truth table to toggle between 0, 1, and X
3. The K-Map updates automatically

### Boolean Expression Verification

1. Enter a Boolean expression (e.g., "AB + CD'")
2. Click "Verify Expression"
3. The tool will show if your expression matches the current K-Map

### K-Map Cell Tools

- **Set to 1**: Click cells to set them to 1
- **Set to 0**: Click cells to set them to 0
- **Set to X**: Click cells to set them to don't care
- **Select**: Choose cells for expression generation
- **Clear**: Reset the K-Map

## Currently Supported Features

- Full support for minterm mode with SOP simplification
- Input Boolean expressions in SOP form
- Truth table editing and visualization
- K-Map cell selection and expression generation

## Contributing

Contributions are welcome! Feel free to submit a pull request or open an issue.

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.
