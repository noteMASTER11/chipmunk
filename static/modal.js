$(document).ready(function() {
    let bearerToken = '';
    let currentUpgradeId = '';
    let currentUpgradePrice = 0;
    let currentProfitPerHour = 0;
    let currentProfitPerHourDelta = 0;
    let balanceUpdateInterval;

    function showModal(message) {
        $('#modal-message').text(message);
        $('#modal').fadeIn(500);
    }

    function closeModal() {
        $('#modal').fadeOut(500);
    }

    function showTokenModal() {
        $('#token-modal').fadeIn(500);
    }

    function closeTokenModal() {
        $('#token-modal').fadeOut(500);
    }

    function showConfirmModal(message) {
        $('#confirm-message').html(message);
        $('#confirm-modal').fadeIn(500);
    }

    function closeConfirmModal() {
        $('#confirm-modal').fadeOut(500);
    }

    function startBalanceUpdate() {
        function updateBalance() {
            fetchBalanceInfo();
            const randomInterval = Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;
            balanceUpdateInterval = setTimeout(updateBalance, randomInterval);
        }
        updateBalance();
    }

    $('.close').click(closeModal);
    $('#modal-ok').click(closeModal);

    $('.close-confirm').click(closeConfirmModal);
    $('#confirm-cancel').click(closeConfirmModal);

    $('#token-submit').click(function() {
        const token = $('#token-input').val().trim();
        if (token) {
            bearerToken = token;
            closeTokenModal();
            $('#fetchData').prop('disabled', false);
            $('#getUserInfo').prop('disabled', false);
            fetchBalanceInfo();
            fetchData();
            startBalanceUpdate();
        } else {
            showModal('Please enter a valid Bearer Token.');
        }
    });

    $(window).click(function(event) {
        if (event.target.id === 'modal') {
            closeModal();
        }
        if (event.target.id === 'token-modal') {
            closeTokenModal();
        }
        if (event.target.id === 'confirm-modal') {
            closeConfirmModal();
        }
    });

    // Show the token modal on page load
    showTokenModal();

    $('#fetchData').click(function() {
        fetchData();
    });

    function fetchData() {
        if (!bearerToken) {
            showModal('Please enter a valid Bearer Token.');
            return;
        }
        const count = $('#count').val();
        $.get('/get_data', { count: count, token: bearerToken }, function(data) {
            const balance = parseFloat($('#balance').text().replace(/\s/g, ''));
            const earnPerHour = parseFloat($('#earnPerHour').text().replace(/\s/g, ''));
            const tbody = $('#dataTable tbody');
            tbody.empty();
            data.forEach(function(item) {
                const price = item[4];
                const priceFormatted = price.toLocaleString('ru-RU');
                const priceClass = price <= balance ? 'price-green' : 'price-red';
                tbody.append(`<tr>
                    <td>${item[0]}</td>
                    <td>${item[1]}</td>
                    <td>${item[2]}</td>
                    <td>${item[3].toFixed(2)}</td>
                    <td class="${priceClass}"><strong>${priceFormatted}</strong></td>
                    <td><button class="upgrade-btn" data-id="${item[0]}" data-price="${price}" data-profit="${item[3]}" data-delta="${item[5]}">Upgrade</button></td>
                </tr>`);
            });

            $('.upgrade-btn').click(function() {
                currentUpgradeId = $(this).data('id');
                currentUpgradePrice = $(this).data('price');
                currentProfitPerHour = $(this).data('profit');
                currentProfitPerHourDelta = $(this).data('delta');
                if (currentUpgradePrice <= balance) {
                    const remainingBalance = Math.floor(balance - currentUpgradePrice);
                    const newEarnPerHour = Math.floor(earnPerHour + currentProfitPerHourDelta);
                    const message = `
                        <p>Are you sure you want to upgrade ID <strong>${currentUpgradeId}</strong>?</p>
                        <p>Cost: <strong>${currentUpgradePrice.toLocaleString('ru-RU')}</strong></p>
                        <p>Remaining Balance: <strong>${remainingBalance.toLocaleString('ru-RU')}</strong></p>
                        <p>New Earn / h: <strong>${newEarnPerHour.toLocaleString('ru-RU')}</strong> (<span style="color: green; font-weight: bold;">+ ${currentProfitPerHourDelta.toLocaleString('ru-RU')}</span>)</p>
                    `;
                    showConfirmModal(message);
                } else {
                    showModal('Not enough balance to upgrade this ID.');
                }
            });
        });

        fetchBalanceInfo();
    }

    $('#confirm-ok').click(function() {
        $.ajax({
            url: '/upgrade',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ upgradeId: currentUpgradeId, token: bearerToken }),
            success: function(response) {
                showModal(`Upgrade успешно выполнен для ${currentUpgradeId}`);
                fetchBalanceInfo();
                fetchData();
                closeConfirmModal();
            },
            error: function(xhr) {
                const error = xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error';
                showModal(`Ошибка выполнения upgrade для ${currentUpgradeId}: ${error}`);
                closeConfirmModal();
            }
        });
    });

    $('#enterCipher').click(function() {
        if (!bearerToken) {
            showModal('Please enter a valid Bearer Token.');
            return;
        }
        const cipher = $('#cipher').val();
        $.ajax({
            url: '/validate_cipher',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ cipher: cipher, token: bearerToken }),
            success: function(response) {
                showModal('Cipher successfully validated!');
            },
            error: function(xhr) {
                const error = xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error';
                showModal(`Ошибка проверки cipher: ${error}`);
            }
        });
    });

    $('#getUserInfo').click(function() {
        fetchUserInfo();
    });

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp * 1000); // Преобразование в миллисекунды
        return date.toLocaleString();
    }

    function formatNumber(number) {
        return number.toLocaleString('ru-RU'); // Используем русский формат для чисел
    }

    function fetchBalanceInfo() {
        if (!bearerToken) {
            showModal('Please enter a valid Bearer Token.');
            return;
        }
        $.ajax({
            url: '/get_balance_info',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ token: bearerToken }),
            success: function(response) {
                $('#balance').text(formatNumber(response.balance));
                $('#taps').text(formatNumber(response.taps));
                $('#lastUpdate').text(formatTimestamp(response.last_update));
                $('#exchange').text(response.exchange);
                $('#earnPerSec').text(formatNumber(response.earn_per_sec));
                $('#earnPerHour').text(formatNumber(response.earn_per_hour));
                $('#earnPerDay').text(formatNumber(response.earn_per_day));
                $('#earnPerWeek').text(formatNumber(response.earn_per_week));
                $('#lastPassiveEarn').text(formatNumber(response.last_passive_earn));
            },
            error: function(xhr) {
                const error = xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error';
                showModal(`Ошибка получения данных баланса: ${error}`);
            }
        });
    }

    function fetchUserInfo() {
        if (!bearerToken) {
            showModal('Please enter a valid Bearer Token.');
            return;
        }
        $.ajax({
            url: '/get_user_info',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ token: bearerToken }),
            success: function(response) {
                const userInfo = `
                    <p><strong>ID:</strong> <em>${response.user_id}</em></p>
                    <p><strong>Bot:</strong> <em>${response.bot}</em></p>
                    <p><strong>First Name:</strong> <em>${response.first_name}</em></p>
                    <p><strong>Last Name:</strong> <em>${response.last_name}</em></p>
                    <p><strong>Telegram Username:</strong> <em>${response.telegram_username}</em></p>
                    <p><strong>Language:</strong> <em>${response.language}</em></p>
                `;
                $('#userInfoContent').html(userInfo);
            },
            error: function(xhr) {
                const error = xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error';
                showModal(`Ошибка получения данных пользователя: ${error}`);
            }
        });
    }
});
