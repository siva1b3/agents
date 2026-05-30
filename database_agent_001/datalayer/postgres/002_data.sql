DO $$
DECLARE
    i INTEGER;
    customer_id INTEGER;
    random_customer_id INTEGER;

    names TEXT[] := ARRAY[
        'Alice Johnson', 'Bob Smith', 'Carol White', 'David Brown', 'Eva Martinez',
        'Frank Lee', 'Grace Kim', 'Henry Wilson', 'Isla Thompson', 'Jack Davis',
        'Karen Moore', 'Liam Taylor', 'Mia Anderson', 'Noah Jackson', 'Olivia Harris'
    ];

    countries TEXT[] := ARRAY[
        'USA', 'Germany', 'France', 'India', 'Brazil',
        'Canada', 'Japan', 'Australia', 'UK', 'Mexico'
    ];

    products TEXT[] := ARRAY[
        'Laptop', 'Mouse', 'Keyboard', 'Monitor', 'Headphones',
        'Webcam', 'USB Hub', 'SSD Drive', 'RAM Module', 'GPU Card'
    ];

    statuses TEXT[] := ARRAY['pending', 'shipped', 'delivered', 'cancelled'];

BEGIN
    -- Insert 15 customers
    FOR i IN 1..15 LOOP
        INSERT INTO customers (name, email, country)
        VALUES (
            names[i],
            LOWER(REPLACE(names[i], ' ', '.')) || '@example.com',
            countries[(RANDOM() * 9 + 1)::INTEGER]
        );
    END LOOP;

    -- Insert 50 orders linked to random customers
    FOR i IN 1..50 LOOP
        SELECT id INTO random_customer_id
        FROM customers
        ORDER BY RANDOM()
        LIMIT 1;

        INSERT INTO orders (customer_id, product_name, quantity, price, status)
        VALUES (
            random_customer_id,
            products[(RANDOM() * 9 + 1)::INTEGER],
            (RANDOM() * 9 + 1)::INTEGER,
            ROUND((RANDOM() * 990 + 10)::NUMERIC, 2),
            statuses[(RANDOM() * 3 + 1)::INTEGER]
        );
    END LOOP;
END;
$$;