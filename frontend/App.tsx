import React, { StrictMode, Component, useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
// import { createRoot } from 'react-dom/client'
// import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';


interface AppState {
    count_A: number;
    count_B: number;
    stock_price_A: number;
    stock_price_B: number;
    money: number;
}

function handleClick() {
    fetch('http://localhost:3000/stats')
    .then(response => response.json())
    .then(data => {
        console.log(data);
    });
}


class App extends Component<{}, AppState> {
    constructor(props: any) {
        super(props);
        this.state = { count_A: 0, stock_price_A: 50, 
                       count_B: 0, stock_price_B: 50, money: 1000 };
        this.makeTimer();
    }

    makeTimer() {
        setInterval(() => {
            let rand_A = Math.floor((Math.random()+0.1) * 100);
            this.setState({ stock_price_A: rand_A });

            let rand_B = Math.floor((Math.random()+0.1) * 100);
            this.setState({ stock_price_B: rand_B });
        }, 3000);
    }


    buyStockA() {
        this.setState({ count_A: this.state.count_A + 1 });
        this.setState({ money: this.state.money - this.state.stock_price_A });
    }

    buyStockB() {
        this.setState({ count_B: this.state.count_B + 1 });
        this.setState({ money: this.state.money - this.state.stock_price_B });
    }

    sellStockA() {
        this.setState({ count_A: this.state.count_A - 1 });
        this.setState({ money: this.state.money + this.state.stock_price_A });
    }

    sellStockB() {
        this.setState({ count_B: this.state.count_B - 1 });
        this.setState({ money: this.state.money + this.state.stock_price_B });
    }

    render () {
        return (
            <>
                {/* <h1>Vite + React</h1> */}
                <div className="player-info">
                    <h2>Your Money: {this.state.money}</h2>
                </div>
                <div className="card">
                    <button 
                        disabled={this.state.money < this.state.stock_price_A}
                        onClick={this.buyStockA.bind(this)}>
                    Buy
                    </button>
                    <button 
                        disabled={this.state.count_A==0} 
                        onClick={this.sellStockA.bind(this)}>
                    Sell
                    </button>
                    <div className="stock-price">
                        <h2>Stock Price: {this.state.stock_price_A}</h2>
                        <h2>Number of Stocks: {this.state.count_A}</h2>
                    </div>
                    {/* <p>
                    Edit <code>src/App.tsx</code> and save to test HMR
                    </p> */}
                </div>
                <div className="card">
                    <button 
                        disabled={this.state.money < this.state.stock_price_B}
                        onClick={this.buyStockB.bind(this)}>
                    Buy
                    </button>
                    <button 
                        disabled={this.state.count_B==0} 
                        onClick={this.sellStockB.bind(this)}>
                    Sell
                    </button>
                    <div className="stock-price">
                        <h2>Stock Price: {this.state.stock_price_B}</h2>
                        <h2>Number of Stocks: {this.state.count_B}</h2>
                    </div>
                    {/* <p>
                    Edit <code>src/App.tsx</code> and save to test HMR
                    </p> */}
                </div>
                <div className="card">
                    <button onClick={handleClick}>Get Stats</button>
                </div>
                {/* <p className="read-the-docs">
                    Click on the Vite and React logos to learn more
                </p> */}
            </>
        );
    }
}

export default App
