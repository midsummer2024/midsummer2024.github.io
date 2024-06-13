let sr_vs_k_series;
let chart = null;

const color_Tableau20 = ['#4E79A7', '#A0CBE8', '#F28E2B', '#FFBE7D', '#59A14F', '#8CD17D', '#B6992D', '#F1CE63', '#499894', '#86BCB6', '#E15759', '#FF9D9A', '#79706E', '#BAB0AC', '#D37295', '#FABFD2', '#B07AA1', '#D4A6C8', '#9D7660', '#D7B5A6']


function isColliding(yValue, yAdjust, occupiedPositions) {
    // Check if the given position is already occupied.
    // We use a tolerance of +/- 1 for this example.
    const tolerance = 1;

    for (let pos of occupiedPositions) {
        if (Math.abs((yValue + yAdjust) - pos) <= tolerance) {
            return (yValue + yAdjust) >= pos ? 'up' : 'down';
        }
    }

    return null;
}

function hexToRGBA(hex, alpha = 1) {
    // Remove the hash if it exists
    hex = hex.replace('#', '');

    // Convert 3-digit to 6-digit format
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    // Extract the red, green, and blue components
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    // Return the RGBA string
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


document.addEventListener('DOMContentLoaded', function () {
    const taskButtons = [
        'visualize-sr-vs-k-scale-with-model-size-llama2-base',
        'visualize-sr-vs-k-scale-with-model-size-llama2-rlhf'
    ];

    taskButtons.forEach(buttonId => {
        const btn = document.getElementById(buttonId);

        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            taskButtons.forEach(id => {
                const otherBtn = document.getElementById(id);
                otherBtn.classList.remove('active');
            });

            // Add active class to the clicked button
            btn.classList.add('active');

            // Call createChart with different parameters based on the clicked button
            if (buttonId === 'visualize-sr-vs-k-scale-with-model-size-llama2-base') {
                createChart([
                    'AutoUI Filtered BC, Run 1 (General)',
                    'AutoUI Filtered BC, Run 2 (General)',
                    'AutoUI DigiRL, Run 1 (General)',
                    'AutoUI DigiRL, Run 2 (General)',
                    'AutoUI Pretrained (General)',
                    'GPT-4V Set-of-Marks (General)'
                ]);
            } else if (buttonId === 'visualize-sr-vs-k-scale-with-model-size-llama2-rlhf') {
                createChart([
                    'AutoUI Filtered BC, Run 1 (Webshop)',
                    'AutoUI Filtered BC, Run 2 (Webshop)',
                    'AutoUI DigiRL, Run 1 (Webshop)',
                    'AutoUI DigiRL, Run 2 (Webshop)',
                    'AutoUI Pretrained (Webshop)',
                    'GPT-4V Set-of-Marks (Webshop)'
                ]);
            }
        });
    });

    fetch('website/data/sr_vs_k_series.json')
        .then(response => response.json())
        .then(data => {
            sr_vs_k_series = data;
            createChart(default_order);
        });
    
    function createChart(subsetNames, annotate_model_name = true) {
        if (chart) {
            chart.destroy();
        }

        window.delayed = false;

        const ctx = document.getElementById('chart-sr-vs-k');
        const sr_vs_k_series_subset = sr_vs_k_series.filter(series => subsetNames.includes(series.label));

        sr_vs_k_series_subset.forEach((series, index) => {
            series.borderColor = color_Tableau20[index];
            series.backgroundColor = color_Tableau20[index];
        });

        let annotations_for_data = {};
        let occupiedPositions = [];
        let extra_plugin_args = {};
        if (annotate_model_name) {
            sr_vs_k_series_subset.forEach((series, index) => {
                const label = series.label;
                const data = series.data;
                const yValue = data[data.length - 2];

                let yAdjust = 0;
                let direction;
                let count = 0;
                while (direction = isColliding(yValue, yAdjust, occupiedPositions)) {
                    if (direction === 'down') {
                        yAdjust -= 1;
                    } else if (direction === 'up') {
                        yAdjust += 1;
                    } else {
                        break;
                    }
                    count++;
                    if (count > 12) {
                        break;
                    }
                }

                occupiedPositions.push(yValue + yAdjust);
            });
        } else {
            extra_plugin_args = {
                subtitle: {
                    display: true,
                    text: "You can click on the legend to hide or show a model's performance.",
                    font: {
                        size: 12,
                    }
                },
            }
        }

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({ length: 10 }, (_, i) => i * 6 * 16),
                datasets: sr_vs_k_series_subset
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Number of Trajectories Trained',
                            font: {
                                size: 14,
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Success Rate every 16 trajectories',
                            font: {
                                size: 14,
                            }
                        }
                    }
                },
                animation: {
                    onComplete: () => {
                        window.delayed = true;
                    },
                    delay: (context) => {
                        let delay = 0;
                        if (context.type === 'data' && context.mode === 'default' && !window.delayed) {
                            delay = context.dataIndex * 100 + context.datasetIndex * 100;
                        }
                        return delay;
                    },
                    duration: 1000,
                    easing: 'easeInOutQuart',
                    mode: 'x',
                },
                plugins: {
                    colors: {
                        enabled: false,
                    },
                    legend: {
                        display: true,
                        labels: {
                            usePointStyle: true,
                            font: {
                                size: 10,
                            }
                        },
                        align: 'center',
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        position: 'nearest',
                        intersect: false,
                        itemSort: function (a, b) {
                            return b.raw - a.raw;
                        },
                        callbacks: {
                            title: function (context) {
                                return 'Number of trajectories trained on: ' + context[0].label;
                            },
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.formattedValue + '%';
                                return label;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: "Offline-to-online training curves of AutoUI+Filtered BC/DigiRL",
                        font: function (context) {
                            var width = context.chart.width;
                            var size = Math.round(width / 32);
                            size = Math.min(size, 16);
                            return {
                                size: size
                            };
                        }
                    },
                    ...extra_plugin_args,
                },
                elements: {
                    line: {
                        tension: 0.4
                    },
                    point: {
                        radius: 5,
                        hoverRadius: 7,
                        hitRadius: 10,
                        pointStyle: 'circle',
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                        borderColor: 'rgba(0, 0, 0, 0.1)',
                        animation: {
                            x: {
                                type: 'number',
                                easing: 'linear',
                                duration: 1000,
                                from: (ctx) => {
                                    if (ctx.index > 0) {
                                        const prevPoint = ctx.dataset.data[ctx.index - 1];
                                        return prevPoint.x;
                                    } else {
                                        return NaN;
                                    }
                                },
                                delay(ctx) {
                                    if (ctx.type !== 'data' || ctx.xStarted) {
                                        return 0;
                                    }
                                    ctx.xStarted = true;
                                    return ctx.index * 200;
                                }
                            },
                            y: {
                                type: 'number',
                                easing: 'linear',
                                duration: 1000,
                                from: (ctx) => {
                                    if (ctx.index > 0) {
                                        const prevPoint = ctx.dataset.data[ctx.index - 1];
                                        return prevPoint.y;
                                    } else {
                                        return NaN;
                                    }
                                },
                                delay(ctx) {
                                    if (ctx.type !== 'data' || ctx.yStarted) {
                                        return 0;
                                    }
                                    ctx.yStarted = true;
                                    return ctx.index * 200;
                                }
                            }
                        }
                    }
                }
            },
        });
    }
});


const default_order = [
    'AutoUI Filtered BC, Run 1 (General)',
    'AutoUI Filtered BC, Run 2 (General)',
    'AutoUI DigiRL, Run 1 (General)',
    'AutoUI DigiRL, Run 2 (General)',
    'AutoUI Pretrained (General)',
    'GPT-4V Set-of-Marks (General)'
]

const all_models = [
    'AutoUI Filtered BC, Run 1 (Webshop)',
    'AutoUI Filtered BC, Run 2 (Webshop)',
    'AutoUI DigiRL, Run 1 (Webshop)',
    'AutoUI DigiRL, Run 2 (Webshop)',
    'AutoUI Pretrained (Webshop)',
    'GPT-4V Set-of-Marks (Webshop)',
    'AutoUI Filtered BC, Run 1 (General)',
    'AutoUI Filtered BC, Run 2 (General)',
    'AutoUI DigiRL, Run 1 (General)',
    'AutoUI DigiRL, Run 2 (General)',
    'AutoUI Pretrained (General)',
    'GPT-4V Set-of-Marks (General)'
]
