import { useState } from 'react'
import React, { StrictMode, Component } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'

interface AppState {
    count: number;
    number: number;
}

class App extends Component<{}, AppState> {
    constructor(props: any) {
        super(props);
        this.state = { count: 0, number: 0 };
        this.makeTimer();
    }

    makeTimer() {
        setInterval(() => {
            let rand = Math.floor((Math.random() - 0.5) * 100);
            this.setState({ number: rand });
        }, 3000);
    }

    buyStock() {
        this.setState({ count: this.state.count + 1 });
    }

    sellStock() {
        if (this.state.count > 0) {
            this.setState({ count: this.state.count - 1 });
        }
    }

    render () {
        return (
            <>
                {/* <h1>Vite + React</h1> */}
                <div className="card">
                    <button onClick={this.buyStock.bind(this)}>
                    Buy
                    </button>
                    <button onClick={this.sellStock.bind(this)}>
                    Sell
                    </button>
                    {/* <p>
                    Edit <code>src/App.tsx</code> and save to test HMR
                    </p> */}
                </div>
                <div className="stock-price">
                    <h2>Stock Price: {this.state.number}</h2>
                    <h2>Number of Stocks: {this.state.count}</h2>
                    <h2>Your Earnings: {this.state.number * this.state.count}</h2>
                </div>
                {/* <p className="read-the-docs">
                    Click on the Vite and React logos to learn more
                </p> */}
            </>
        );
    }
}

export default App
