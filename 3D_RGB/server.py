#!/bin/python
# -*- coding: UTF-8 -*-
# 文件名：server.py
# create by wzh 2017/10/26

import socket  # 导入socket模块
import re
from multiprocessing import Process  # 导入进程模块

# 设置静态文件根目录
HTML_ROOT_DIR = './'


def handle_client(client_socket):
    """处理客户端连接请求"""
    request_data = client_socket.recv(1024)
    # print(request_data)
    request_lines = request_data.splitlines()
    # for line in request_lines:
    #     print(line)
    #'GET / HTTP/1.1'
    request_start_line = request_lines[0].decode("utf-8")
    # print("*"*10)
    # print(request_start_line)

    # 提取用户请求的文件名
    file_name = re.match(r"\w+ +(/[^ ]*) ", str(request_start_line)).group(1)
    if "/" == file_name:
        file_name = '/index.html'

    # 打开文件，读取内容
    try:
        file = open(HTML_ROOT_DIR+file_name, "rb")
    except IOError:
        response_start_line = "HTTP/1.1 404 Not Found\r\n"
        response_heads = "Server: My server\r\n"
        response_body = "The file not found!"
    else:
        file_data = file.read()
        file.close()
        response_start_line = "HTTP/1.1 200 ok\r\n"
        response_heads = "Server: My server\r\n"
        response_body = file_data.decode("utf-8")

    response = response_start_line+response_heads+"\r\n"+response_body
    # print("response data:", response)

    client_socket.send(bytes(response, "utf-8"))
    client_socket.close()


if __name__ == "__main__":  # 如果直接运行本文件，那么__name__为__main__(此时才运行下面的程序)，否则为对应包名
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)  # 创建socket对象
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    # host = socket.gethostname() # 获取本地主机名
    port = 1212
    # print(host)
    s.bind(("", port))  # 绑定端口
    s.listen(5)
    while True:
        c, addr = s.accept()  # 建立客户端连接
        # print('连接地址', addr)
        handle_client_process = Process(
            target=handle_client, args=(c,))  # ALT+ENTER快捷键生成函数
        handle_client_process.start()
        c.close()

# how to run the website:
#    python server.py
# then go to the web browser, input:
#    localhost:1212