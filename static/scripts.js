$(document).ready(function() {
    function validateToken(token) {
        const pattern = /^Bearer .{40,}$/; // Проверка на 'Bearer ' и минимум 40 символов
        return pattern.test(token);
    }

    function updateButtonState() {
        const token = $('#token').val();
        if (validateToken(token)) {
            $('#fetchData').prop('disabled', false);
        } else {
            $('#fetchData').prop('disabled', true);
        }
    }

    $('#token').on('input', function() {
        updateButtonState();
    });

    // Проверить состояние кнопки при загрузке страницы
    updateButtonState();

    $('#fetchData').click(function() {
        const token = $('#token').val();
        const count = $('#count').val();
        const balance = parseFloat($('#balance').text().replace(/\s/g, ''));
        $.get('/get_data', { count: count, token: token }, function(data) {
            const tbody = $('#dataTable tbody');
            tbody.empty();
            data.forEach(function(item) {
                const price = item[4];
                const priceFormatted = price.toLocaleString('ru-RU');
                const priceClass = price >= balance ? 'price-green' : 'price-red';
                tbody.append(`<tr>
                    <td>${item[0]}</td>
                    <td>${item[1]}</td>
                    <td>${item[2]}</td>
                    <td>${item[3].toFixed(2)}</td>
                    <td class="${priceClass}"><strong>${priceFormatted}</strong></td>
                    <td><button class="upgrade-btn" data-id="${item[0]}">Upgrade</button></td>
                </tr>`);
            });

            $('.upgrade-btn').click(function() {
                const upgradeId = $(this).data('id');
                const token = $('#token').val();
                $.ajax({
                    url: '/upgrade',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({ upgradeId: upgradeId, token: token }),
                    success: function(response) {
                        alert(`Upgrade успешно выполнен для ${upgradeId}`);
                    },
                    error: function(xhr) {
                        const error = xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error';
                        alert(`Ошибка выполнения upgrade для ${upgradeId}: ${error}`);
                    }
                });
            });
        });
    });

    $('#enterCipher').click(function() {
        const cipher = $('#cipher').val();
        $.ajax({
            url: '/validate_cipher',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ cipher: cipher }),
            success: function(response) {
                alert('Cipher successfully validated!');
            },
            error: function(xhr) {
                const error = xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error';
                alert(`Ошибка проверки cipher: ${error}`);
            }
        });
    });

    $('#getUserInfo').click(function() {
        const token = $('#token').val();
        $.ajax({
            url: '/get_user_info',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ token: token }),
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
                alert(`Ошибка получения данных пользователя: ${error}`);
            }
        });
    });

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp * 1000); // Преобразование в миллисекунды
        return date.toLocaleString();
    }

    function formatNumber(number) {
        return number.toLocaleString('ru-RU'); // Используем русский формат для чисел
    }

    function fetchBalanceInfo() {
        const token = $('#token').val();
        $.ajax({
            url: '/get_balance_info',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ token: token }),
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
                alert(`Ошибка получения данных баланса: ${error}`);
            }
        });
    }

    // Fetch balance info on page load
    fetchBalanceInfo();

    // Handle tab switching
    $('.tablinks').click(function(event) {
        event.preventDefault();
        var tabId = $(this).attr('href');
        $('.tabcontent').removeClass('active');
        $('.tablinks').removeClass('active');
        $(tabId).addClass('active');
        $(this).addClass('active');
    });

    // Open the default tab
    $('#defaultOpen').click();
});
