create table ebooks (
    id int primary key auto_increment,
    title varchar(255) not null,
    author varchar(255) not null,
    file_path varchar(255) not null,
    format varchar(255) not null,
    size_bytes bigint not null,
    created_at datetime not null,
    modified_at datetime not null
);

INSERT INTO ebooks (title, author, file_path, format, size_bytes, created_at, modified_at) VALUES ('货币战争', '', '豆瓣图书TOP250/货币战争.epub', 'EPUB', 274496, '2024-06-28T17:53:16', '2024-06-28T17:53:16');
INSERT INTO ebooks (title, author, file_path, format, size_bytes, created_at, modified_at) VALUES ('货币战争2：金权天下', '', '豆瓣图书TOP250/货币战争2：金权天下.epub', 'EPUB', 106963, '2024-06-28T17:55:47', '2024-06-28T17:55:47');